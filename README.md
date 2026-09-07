# Note-Taking App - Secure Note Sharing

This is a note-taking app where you can write a note and share it with a link. You get to control how the link behaves - it can open just once, or stay open until a certain date/time. You can also decide if anyone with the link can open it (public) or if they need a password (access key) to unlock it.

## Tech Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS
- Backend: Next.js API routes (its the same project, no separate backend server needed)
- Database: PostgreSQL, hosted on Neon (free tier)
- ORM: Prisma, so we don't have to write raw SQL everywhere
- Auth: built it myself using JWT tokens for sessions and bcrypt for hashing passwords, no NextAuth or anything

## How to Run This

1. Install everything
```
npm install --legacy-peer-deps
```
2. Copy `.env.example` to `.env` and fill in the values:
- `DATABASE_URL` - your postgres connection string, get a free one from neon.tech
- `JWT_SECRET` - any long random string works
- `NEXT_PUBLIC_APP_URL` - use `http://localhost:3000` when running locally

3. Push the schema and generate the client
```
npx prisma generate
npx prisma db push
```
4. Run it
```
npm run dev
```
5. go to `http://localhost:3000`

## Database Schema

- **User** - name, email, hashed password. we never save the plain password anywhere
- **Note** - title, content, and which user owns it
- **ShareLink** - linked to one note. has the random token (the code in the URL), whether its one-time or time-based, whether it needs a password, the hashed password, expiry date, a `used` flag, a `revoked` flag, and a view count
- **AccessLog** - every time someone tries to open a link, success or fail, we log it here with the reason. mainly so we can show/prove things are working correctly and for future rate-limiting

check `prisma/schema.prisma` for the exact fields.

## Share Link Flow

1. User creates a note on `/notes/new` - fills title, content, picks share type and access type, and expiry if its time-based. The API creates the note and the share link at the same time. If its password protected, we generate a random key and show it ONE TIME on this screen only.
2. When someone opens `/share/<token>`, the page first does a GET request just to check the link's status (valid, expired, revoked, already used). this doesn't change anything in the db, so refreshing the page is totally safe and won't burn a one-time link.
3. If its public, we go ahead and reveal the note right away. If it needs a password, we show a form and wait for the user to type it in.
4. Owner can go to `/notes/[id]` anytime to see the note, check the link status, see how many times its been viewed, and revoke it if they want.

## Password / Key Generation

- when someone picks "password protected", we generate a random 10 character code. left out confusing characters like 0/O and 1/l so its easy to type correctly
- we only save the bcrypt hash of this key in the db, never the actual key. so even if someone got into the database they still couldn't get the real password back
- the real key is only shown once, right after creating the note. if the owner loses it, there's no way to recover it (would need to generate a new link)

## Expiry Logic

- one-time links don't really use a date at all, they just use a `used` boolean. starts as false, and the moment someone successfully views it, it flips to true. after that nothing works anymore
- time-based links save an actual `expiresAt` timestamp, and every time someone tries to access it we just check if the current time has already passed that. no cron job or background worker needed, it just checks live whenever someone visits

## Revoke Logic

owner clicks "Revoke" on the notes page, this sets `revoked = true` on the share link. every single access path (the status check AND the actual view) checks this revoked flag first before anything else. so even if someone already has the password form open, the moment its revoked they can't get through anymore

## View Count Logic

- count only goes up when someone actually successfully views the note - either a public view or entering the correct password
- wrong password = no increase. expired/revoked/already-used = no increase either
- the increment happens in the same database call as the used/revoked check (see below), so there's no separate step where something could go wrong or double count

## Race Condition Handling

this is the part that needed the most thought. the requirement is: if two people open the same one-time link at basically the same moment, only one of them should be able to see it.

if you write this the obvious way, it looks like this and it's actually broken:
```js
const link = await db.shareLink.findUnique(...)
if (!link.used) {
  await db.shareLink.update({ data: { used: true } })
  return content // both requests could reach here at the same time!
}
```
the problem is there's a gap between checking `used` and actually setting it to true. if two requests come in at nearly the same instant, both could read `used: false` before either one gets around to writing `true`. so both would end up showing the content, which defeats the whole point of "one-time".

what we do instead (in `src/app/api/share/[token]/view/route.ts`) is combine the check and the update into ONE database call:
```js
const result = await prisma.shareLink.updateMany({
  where: {
    id: link.id,
    revoked: false,
    used: false, // only applies for one-time links
  },
  data: {
    viewCount: { increment: 1 },
    used: true,
  },
})

if (result.count === 0) {
  // someone else already grabbed it, or it got revoked/expired
}
```
this works because postgres locks the row while running an update. whichever request gets there first wins and flips `used` to true. the second request has to wait for that lock, and once it does run, its own `WHERE used: false` condition no longer matches (because its already true now) - so it just updates 0 rows. we check `result.count` to know who won. this holds up no matter how many requests hit it at the same time, not just two.

also worth pointing out - we check the password before this whole block runs. so a wrong password attempt never touches `used` or the view count at all, it just gets rejected early.

## Answering the required questions

**How do you prevent two users from using a one-time link at the same time?**
one atomic `updateMany` call with `used: false` in the where clause, instead of a separate read-then-write. postgres row locking makes sure only one request can flip it, everyone else gets 0 rows updated and we treat that as "too late".

**How do you update view count safely?**
using `{ increment: 1 }` which becomes `viewCount = viewCount + 1` at the database level. we're not reading the number into javascript, adding 1, then writing it back - that would lose updates under concurrent requests. also this happens in the same call as the used-flag check so its all one atomic operation.

**How would this work if 1 million people opened the link?**
for a one-time link it works exactly the same regardless of scale - the atomic update guarantees exactly 1 winner whether its 2 requests or 2 million, that's the whole point of doing it this way. for public/time-based links where everyone's allowed to view, all those requests would still correctly increment the counter one at a time (postgres handles that safely), though at real scale you'd want to add things like a queue to batch up the count updates instead of hitting the db directly on every single view, and maybe cache the read-only status check behind a CDN so it's not hammering the database for every page load.

**How would you prevent brute force on password protected links?**
right now every failed attempt gets logged with a reason and a timestamp in AccessLog, which is basically the groundwork for this. next step for a real production version would be rate limiting - like max N wrong attempts per link per IP within some time window, then a short lockout or delay after that. also the auto-generated key is already fairly long/random (10 chars, decent alphabet) so pure guessing is already impractical even before adding rate limits.

## Test Credentials

(will add the test account email/password here before recording the demo)