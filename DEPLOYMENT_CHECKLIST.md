# 🚀 Docker Deployment Checklist for ZK Wordle

## ✅ Pre-Deployment Checklist

### 1. **Environment Configuration**
- [ ] Update `vite.config.ts` with your production domain in `allowedHosts`
- [ ] Verify contract addresses are correct for your target network (Sepolia/Base)
- [ ] Check that RPC endpoints are accessible from your server

### 2. **Build Verification**
```bash
# Test build locally first
npm run build
npm run preview
```
- [ ] Build completes without errors
- [ ] Preview server works on localhost
- [ ] All features work in preview mode

### 3. **Docker Build & Test**
```bash
# Build Docker image
docker build -t zk-wordle .

# Test Docker container locally
docker run -p 5173:5173 -e PORT=5173 zk-wordle

# Test with custom port (if needed)
docker run -p 8080:8080 -e PORT=8080 zk-wordle
```
- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] App is accessible at http://localhost:5173

### 4. **Critical Browser Features**
Test these features in your deployed environment:

#### **localStorage (Critical!)**
- [ ] Create a game and verify secret is stored
- [ ] Refresh page - secret should persist
- [ ] Join a game and verify secret is stored
- [ ] Close tab and reopen - secrets should still be there

#### **Event Listeners**
- [ ] GameCreated event fires and stores secret
- [ ] NewGuess events show up in real-time
- [ ] GuessResult events update boards with colors
- [ ] Both players see each other's guesses

#### **Wallet Connection**
- [ ] MetaMask connects properly
- [ ] Wallet switching works
- [ ] Transaction signing works
- [ ] Network switching prompts appear

---

## 🐛 Common Deployment Issues & Solutions

### Issue 1: "No Secret Found" Warning
**Symptoms:** Yellow warning banner shows even though you created the game

**Causes:**
- GameCreated event fired before event listener initialized
- pendingSecret in sessionStorage not processed

**Solution:** ✅ Already implemented fallback mechanism in `TwoPlayerGame.tsx`

**Verify Fix Works:**
1. Create a game
2. Check browser DevTools → Application → Session Storage
3. Should see `pendingSecret` briefly, then it moves to Local Storage
4. Warning banner should NOT appear

---

### Issue 2: WebSocket Connection Failures
**Symptoms:** 
```
WebSocket connection to 'ws://...' failed
```

**Solution:**
Update `vite.config.ts`:
```typescript
server: {
  host: '0.0.0.0',
  hmr: { 
    protocol: 'wss', // Use WSS for HTTPS sites
    clientPort: 443  // Or your actual port
  }
}
```

---

### Issue 3: Events Not Appearing Across Clients
**Symptoms:** Player 1 makes a guess, Player 2 doesn't see it

**Causes:**
- Event polling not working across different browser tabs/devices
- RPC endpoint rate limiting

**Solutions:**
1. **Increase polling frequency** (already set to 1000ms in `useGameState.ts`)
2. **Use dedicated RPC endpoint** instead of public ones
3. **Check browser console** for both players to see event logs

**Debug Commands:**
```javascript
// In browser console, check if events are firing
localStorage.getItem('wordle_secret_GAME_ADDRESS')
sessionStorage.getItem('pendingSecret')
```

---

### Issue 4: Verify Button Not Showing
**Symptoms:** Button doesn't appear even though it's player's turn

**Check in this order:**
1. ✅ Does player have secret? Check console: `hasSecret: true/false`
2. ✅ Is it their turn to verify? Check: `turnToVerifyRaw` matches player address
3. ✅ Does opponent have unverified guess? Check: `player1HasUnverifiedGuess` or `player2HasUnverifiedGuess`
4. ✅ Expand `showVerifyForPlayer1_breakdown` in console to see exact reason

**Solution:** Console now shows detailed `reason` field explaining why button won't show

---

### Issue 5: Old Events Being Replayed
**Symptoms:** Guesses get auto-verified immediately, duplicate events

**Solution:** ✅ Already implemented event deduplication using transaction hash + log index

**Verify Fix:**
Look for console logs:
```
⏭️ Skipping already processed NewGuess event: 0x...
⏭️ Skipping already processed GuessResult event: 0x...
```

---

## 🔒 Security Considerations

### localStorage Security
⚠️ **Important:** Secrets are stored in browser localStorage

**Risks:**
- If user clears browser data → secrets lost → can't verify anymore
- XSS vulnerabilities could expose secrets
- Shared computers could expose secrets

**Mitigations:**
1. Add export/import feature for secrets
2. Warn users not to clear browser data
3. Consider encrypting localStorage values
4. Add session timeout for sensitive operations

### Contract Interaction
- [ ] All contract addresses are verified on Etherscan
- [ ] Gas limits are reasonable (currently: 5M guess, 10M verify)
- [ ] No infinite approval amounts
- [ ] Transaction errors are handled gracefully

---

## 📊 Monitoring & Debugging

### Production Console Logs
Keep these debug logs enabled initially:
- `🎮 TwoPlayerGame board state:`
- `🔍 Verification State:`
- `🆕 NewGuess event received:`
- `🔍 GuessResult: Updating board`

**After stable:** You can remove verbose logs by searching for `console.log` in:
- `TwoPlayerGame.tsx`
- `useGameState.ts`
- `useWordleFactory.ts`

### Key Metrics to Watch
1. **Event Processing Time:** How long between NewGuess → board update
2. **Secret Storage Success Rate:** % of games where secret is stored
3. **Verification Success Rate:** % of verify attempts that succeed
4. **Gas Usage:** Average gas per guess and verify

---

## 🌐 Network-Specific Configuration

### Sepolia Testnet (Current)
```typescript
// frontend/config.ts
export const WORDLE_FACTORY_ADDRESS = "0x..." // Your factory
export const CHAIN_ID = 11155111; // Sepolia
```

### Base Sepolia (If switching)
```typescript
export const WORDLE_FACTORY_ADDRESS = "0x..." // Your factory
export const CHAIN_ID = 84532; // Base Sepolia
```

### Mainnet (Future)
- [ ] Audit contracts thoroughly
- [ ] Test with real ETH on testnet first
- [ ] Set appropriate gas limits
- [ ] Add transaction confirmation dialogs
- [ ] Implement gas price estimation

---

## 🐳 Docker-Specific Issues

### Issue: Build Fails on Alpine Linux
**Error:** `node-gyp rebuild` fails

**Solution:** ✅ Already have `python3 make g++` in Dockerfile

### Issue: Port Not Accessible
**Check:**
```bash
docker ps  # Verify container is running
docker logs CONTAINER_ID  # Check for errors
```

**Solution:**
```bash
# Make sure PORT env var is set
docker run -p 5173:5173 -e PORT=5173 zk-wordle

# Or let Docker assign port
docker run -P zk-wordle
docker ps  # See which port was assigned
```

### Issue: Environment Variables Not Working
**Solution:**
Create `.env.production` file:
```env
VITE_CHAIN_ID=11155111
VITE_FACTORY_ADDRESS=0x...
```

Load in Docker:
```bash
docker run --env-file .env.production -p 5173:5173 zk-wordle
```

---

## 📱 Mobile/Browser Compatibility

### MetaMask Mobile
- [ ] Test game creation on mobile
- [ ] Test joining on mobile
- [ ] Test wallet switching
- [ ] Test cross-device play (mobile vs desktop)

### Browser Support
Test on:
- [ ] Chrome/Brave (main target - has MetaMask)
- [ ] Firefox (MetaMask available)
- [ ] Safari (mobile - use WalletConnect)
- [ ] Mobile browsers (in-app MetaMask browser)

---

## 🚀 Final Deployment Steps

1. **Build and push Docker image:**
```bash
docker build -t YOUR_REGISTRY/zk-wordle:latest .
docker push YOUR_REGISTRY/zk-wordle:latest
```

2. **Deploy to your server** (Dokploy/Railway/Vercel/etc.)

3. **Verify deployment:**
- [ ] Site is accessible at production URL
- [ ] SSL certificate is valid (HTTPS)
- [ ] MetaMask connects successfully
- [ ] Create test game with two different wallets
- [ ] Complete full game flow: create → join → guess → verify → guess → verify

4. **Monitor for 24 hours:**
- [ ] Check logs for errors
- [ ] Monitor transaction success rate
- [ ] Watch for event processing issues
- [ ] Verify no memory leaks (Docker container memory usage stable)

---

## 🔧 Emergency Rollback Plan

If critical issues occur:

1. **Keep old Docker image:**
```bash
docker tag zk-wordle:latest zk-wordle:backup
```

2. **Quick rollback:**
```bash
docker run -p 5173:5173 zk-wordle:backup
```

3. **Contract issues:**
- Can't rollback contracts (they're immutable)
- Deploy new factory if needed
- Update `WORDLE_FACTORY_ADDRESS` in config
- Redeploy frontend

---

## 📞 Support & Debugging

### User Reports Issues
Ask them to:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Find and expand `🔍 Verification State:` object
4. Screenshot and send the `reason` field

### Common User Issues

**"I can't verify!"**
→ Check if they have the secret for that specific game
→ Verify they created or joined that game

**"Other player's guess not showing!"**
→ Both players refresh the page
→ Check if events are firing in console
→ Verify RPC endpoint is working

**"Transaction failed!"**
→ Check gas limit is sufficient
→ Verify word is in dictionary
→ Check wallet has enough ETH

---

## ✅ Launch Checklist

Before announcing to users:
- [ ] All tests pass on production deployment
- [ ] Secrets persist across page refreshes
- [ ] Both players can see each other's moves in real-time
- [ ] Verification works after first and second guesses
- [ ] Event deduplication prevents duplicates
- [ ] Warning banner only shows when appropriate
- [ ] Mobile MetaMask works
- [ ] Docker container restarts successfully
- [ ] Logs show no critical errors
- [ ] Gas costs are reasonable

**You're ready to ship! 🚀**
