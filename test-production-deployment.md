# Production Deployment Testing Checklist

## Pre-Deployment Verification

- [ ] Railway backend deployed successfully
- [ ] Railway PostgreSQL database created
- [ ] Vercel frontend deployed successfully
- [ ] All environment variables set in both Railway and Vercel
- [ ] Google OAuth redirect URIs updated
- [ ] Stripe webhook endpoint created
- [ ] Stripe products and prices created
- [ ] Database updated with Stripe product/price IDs

## Test URLs

Replace these with your actual deployment URLs:

- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-backend.up.railway.app
- **Backend Health:** https://your-backend.up.railway.app/api/health

## Manual Testing Steps

### 1. Backend Health Check

```bash
curl https://your-backend.up.railway.app/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-12-31T..."}
```

### 2. Frontend Loads

- [ ] Visit `https://your-app.vercel.app`
- [ ] No console errors in browser DevTools
- [ ] Homepage displays correctly
- [ ] Navigation works

### 3. User Registration

- [ ] Click "Sign Up"
- [ ] Register with email/password
- [ ] Successfully redirected after signup
- [ ] Can see dashboard (with upgrade prompt since not subscribed)

### 4. User Login

- [ ] Log out
- [ ] Log back in with same credentials
- [ ] Successfully authenticated

### 5. Google OAuth

- [ ] Click "Sign in with Google"
- [ ] Redirected to Google OAuth
- [ ] Authorize the app
- [ ] Redirected back to app
- [ ] Successfully authenticated

### 6. Pricing Page

- [ ] Visit `/pricing`
- [ ] All three plans display (Daily $0.99, Weekly $6.49, Monthly $29.99)
- [ ] "Subscribe Now" buttons visible

### 7. Stripe Checkout Flow

**Using Stripe Test Cards:** https://stripe.com/docs/testing#cards

- [ ] Click "Subscribe Now" on Monthly plan
- [ ] Redirected to Stripe Checkout
- [ ] Use test card: `4242 4242 4242 4242`
  - Expiry: Any future date (e.g., 12/34)
  - CVC: Any 3 digits (e.g., 123)
  - ZIP: Any 5 digits (e.g., 12345)
- [ ] Complete payment
- [ ] Redirected to success page
- [ ] Check email for Stripe receipt (if you entered real email)

### 8. Subscription Active

- [ ] After successful checkout, verify subscription is active
- [ ] User should now have access to AI features
- [ ] Visit `/resumes/new` and create a resume
- [ ] Try AI features (should work now)

### 9. Test Coupon Code

- [ ] Log out and create new account
- [ ] Go to `/pricing`
- [ ] Click "Subscribe Now"
- [ ] On Stripe Checkout, enter coupon code: `TESTFREE`
- [ ] Price should drop to $0.00
- [ ] Complete checkout with test card
- [ ] Verify subscription active

### 10. Webhook Verification

Check Railway backend logs:

```bash
# If using Railway CLI:
railway logs

# Look for webhook events like:
# "Received Stripe webhook: checkout.session.completed"
# "Subscription activated for user: ..."
```

Or check in Railway dashboard → Deployments → View Logs

### 11. Database Verification

Connect to Railway PostgreSQL and verify:

```sql
-- Check users have subscriptions
SELECT id, email, is_subscribed, subscription_end_date
FROM users
WHERE is_subscribed = true;

-- Check subscription history
SELECT * FROM user_subscription_history
ORDER BY subscribed_at DESC
LIMIT 5;

-- Check Stripe products are linked
SELECT plan_id, name, price, stripe_product_id, stripe_price_id
FROM subscription_plans;
```

## Troubleshooting

### Frontend shows "Failed to fetch"

**Check:**
1. Backend is running: `curl https://your-backend.up.railway.app/api/health`
2. `VITE_API_URL` in Vercel matches your Railway backend URL
3. CORS configured: `FRONTEND_URL` in Railway matches Vercel URL

**Fix:**
- Update Vercel environment variables
- Redeploy frontend

### OAuth redirect fails

**Check:**
1. Google OAuth Console has correct redirect URIs
2. `BACKEND_URL` in Railway is correct
3. Check backend logs for errors

**Fix:**
- Update Google OAuth Console authorized redirect URIs
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway

### Stripe checkout fails

**Check:**
1. Stripe products created: `SELECT * FROM subscription_plans;`
2. `stripe_product_id` and `stripe_price_id` are not NULL
3. `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` set correctly
4. Check Railway backend logs

**Fix:**
- Run `./setup-stripe-products.sh` and update database
- Verify Stripe keys in Railway environment variables

### Webhook not receiving events

**Check:**
1. Webhook endpoint URL is correct in Stripe dashboard
2. `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Railway backend logs show webhook attempts

**Fix:**
- Update webhook endpoint in Stripe dashboard
- Update `STRIPE_WEBHOOK_SECRET` in Railway
- Test webhook from Stripe dashboard: Dashboard → Webhooks → Send test webhook

### Database connection fails

**Check:**
1. Railway PostgreSQL is running
2. `DATABASE_URL` environment variable is set
3. Backend logs show connection errors

**Fix:**
- Verify PostgreSQL service is running in Railway
- Check `DATABASE_URL` is auto-set by Railway
- Restart backend service

## Performance Testing

### Load Time

- [ ] Homepage loads in < 2 seconds
- [ ] API health check responds in < 500ms
- [ ] Resume builder loads in < 3 seconds

### AI Features (for subscribed users)

- [ ] AI resume analysis completes in < 10 seconds
- [ ] Content suggestions generate in < 5 seconds
- [ ] ATS analysis runs successfully

## Security Verification

- [ ] HTTPS enabled (automatic on Vercel and Railway)
- [ ] JWT tokens are HTTPOnly (check browser DevTools → Application → Local Storage)
- [ ] Passwords hashed (verify in database - should see bcrypt hashes)
- [ ] Rate limiting works (try multiple rapid requests)
- [ ] CORS only allows your frontend domain

## Post-Deployment Monitoring

### Metrics to Track

1. **Uptime:** Both Railway and Vercel show uptime metrics
2. **Error Rate:** Check Railway logs for 500 errors
3. **Response Time:** Monitor API response times
4. **Database Size:** PostgreSQL database size in Railway
5. **Webhook Success Rate:** Stripe dashboard shows webhook delivery status

### Logs to Monitor

**Railway Backend Logs:**
- Application errors
- Database connection issues
- Webhook processing
- Authentication failures

**Vercel Deployment Logs:**
- Build failures
- Runtime errors

**Stripe Dashboard:**
- Failed payments
- Webhook delivery failures
- Subscription status

## Success Criteria

✅ All tests pass
✅ No console errors
✅ OAuth works
✅ Stripe checkout completes successfully
✅ Webhooks processed
✅ Subscriptions activate correctly
✅ AI features accessible to subscribed users
✅ Database queries execute without errors

---

## Next Steps After Successful Deployment

1. **Monitor for 24 hours** - Check logs for any errors
2. **Test with real users** - Invite beta testers
3. **Set up monitoring** - Consider tools like Sentry, LogRocket
4. **Backup strategy** - Railway provides automatic backups, verify they're enabled
5. **Domain setup** - Consider adding custom domain to Vercel
6. **SSL certificates** - Automatic on both platforms, verify HTTPS works
7. **Production Stripe keys** - When ready to accept real payments, switch from test to live keys

## Cost Monitoring

- **Railway:** Check usage in dashboard, should be $5-10/month
- **Vercel:** Free tier should be sufficient initially
- **Stripe:** No monthly fee, just 2.9% + $0.30 per transaction

## Support Resources

- Railway: https://railway.app/help
- Vercel: https://vercel.com/docs
- Stripe: https://support.stripe.com
- Your deployment guide: `DEPLOYMENT.md`
