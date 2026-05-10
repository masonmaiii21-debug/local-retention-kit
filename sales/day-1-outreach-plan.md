# Day 1 Outreach Plan

Goal: prepare the first 15 highly matched pet grooming prospects without sending generic spam.

## Target profile

Start with independent pet grooming shops, not large chains.

Good signs:

- 30 or more Google reviews.
- Some recent reviews have no owner reply.
- Instagram or Facebook is active within the last 30 days.
- They offer repeatable services such as baths, trims, nail care, or monthly grooming.
- Website, phone, email, or DM path is easy to find.

Avoid for the first batch:

- Franchises with corporate marketing teams.
- Shops with no visible contact path.
- Businesses with very few reviews.
- Businesses where every review already has a detailed reply.

## Prospecting workflow

1. Search Google Maps for `pet grooming near [city]`.
2. Open each shop and check reviews.
3. Record the business in `sales/prospect-list-template.csv`.
4. Score fit from 1 to 10.
5. Write one specific observation before contacting them.

Fit scoring:

- `8-10`: strong reviews, missed replies, active social, clear contact path.
- `5-7`: decent fit but missing one signal.
- `1-4`: skip for now.

## First 15 records

Fill these fields before sending anything:

- `business_name`
- `city`
- `state`
- `website`
- `google_maps_url`
- `instagram_url`
- `email`
- `phone`
- `review_count`
- `owner_reply_gap`
- `fit_score`
- `notes`

Use `owner_reply_gap` for the specific opening line. Example:

```text
Two recent five-star reviews mention friendly grooming, but neither has an owner reply yet.
```

## First message rule

Do not lead with the app. Lead with the business outcome.

Use this structure:

```text
Hi [Name], I noticed [specific observation].

I build a small review reply + rebooking follow-up kit for pet grooming shops. It helps owners reply faster and remind past customers to book again.

I can send 3 free examples in your shop's tone if useful.
```

## Daily target

For Day 1:

- Find 15 prospects.
- Send 5 carefully customized messages.
- Prepare 3 free sample messages for anyone who replies.
- Update `status`, `last_contacted`, and `next_step` in the CSV.

Quality matters more than volume for the first batch. The first sale is more likely from a specific, useful observation than from a broad pitch.
