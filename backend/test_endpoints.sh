#!/bin/bash
# KTG-LEDGER Banking API — Full Endpoint Test Suite
BASE="http://localhost:3000"
PASS=0
FAIL=0
TS=$(date +%s)
EMAIL="testktg_${TS}@example.com"

check() {
  local test_name="$1" expected_status="$2" actual_status="$3" body="$4"
  if [ "$actual_status" = "$expected_status" ]; then
    echo "✅ PASS — $test_name (HTTP $actual_status)"
    PASS=$((PASS+1))
  else
    echo "❌ FAIL — $test_name (expected $expected_status, got $actual_status)"
    echo "   Body: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

# Helper: writes JSON data to a temp file to avoid shell escaping issues, then curls
apicall() {
  local method="$1" path="$2" token="$3" json="$4"
  local args=("-s" "-w" "\n%{http_code}" "-X" "$method" "${BASE}${path}" "-H" "Content-Type: application/json")
  [ -n "$token" ] && args+=("-H" "Authorization: Bearer $token")
  if [ -n "$json" ]; then
    echo "$json" > /tmp/_api_body.json
    args+=("-d" "@/tmp/_api_body.json")
  fi
  curl "${args[@]}"
}

parse() {
  RAW="$1"
  STATUS=$(echo "$RAW" | tail -1)
  BODY=$(echo "$RAW" | sed '$d')
}

echo "═══════════════════════════════════════════"
echo " KTG-LEDGER — API Test Suite"
echo " Email: $EMAIL"
echo "═══════════════════════════════════════════"
echo ""

# ── AUTH TESTS ────────────────────────────────
echo "── Auth Endpoints ──"

parse "$(apicall POST /api/auth/register '' '{"name":"Test User","email":"'"$EMAIL"'","password":"password123"}')"
check "Register new user" 201 "$STATUS" "$BODY"
TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
echo "   Token: ${TOKEN:0:30}..."

parse "$(apicall POST /api/auth/register '' '{"name":"Only Name"}')"
check "Register — missing fields" 400 "$STATUS" "$BODY"

parse "$(apicall POST /api/auth/register '' '{"name":"Dup","email":"'"$EMAIL"'","password":"pass123456"}')"
check "Register — duplicate email" 422 "$STATUS" "$BODY"

parse "$(apicall POST /api/auth/login '' '{"email":"'"$EMAIL"'","password":"password123"}')"
check "Login — correct creds" 200 "$STATUS" "$BODY"
LOGIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

parse "$(apicall POST /api/auth/login '' '{"email":"'"$EMAIL"'","password":"wrongpw1"}')"
check "Login — wrong password" 401 "$STATUS" "$BODY"

parse "$(apicall POST /api/auth/login '' '{"email":"nobody@nowhere.com","password":"x12345"}')"
check "Login — non-existent email" 401 "$STATUS" "$BODY"

parse "$(apicall POST /api/auth/login '' '{"email":"only@email.com"}')"
check "Login — missing password" 400 "$STATUS" "$BODY"

echo ""
echo "── Security: Protected Routes Without Token ──"

parse "$(apicall GET /api/account '' '')"
check "GET /api/account — no token" 401 "$STATUS" "$BODY"

parse "$(apicall POST /api/account '' '')"
check "POST /api/account — no token" 401 "$STATUS" "$BODY"

parse "$(apicall POST /api/transactions '' '{"fromAccount":"a","toAccount":"b","amount":1,"idempotencyKey":"x"}')"
check "POST /api/transactions — no token" 401 "$STATUS" "$BODY"

echo ""
echo "── Account Endpoints ──"

parse "$(apicall POST /api/account "$LOGIN_TOKEN" '')"
check "Create account" 201 "$STATUS" "$BODY"
ACCT1=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('account',{}).get('_id',''))" 2>/dev/null)
echo "   Account ID: $ACCT1"

parse "$(apicall GET /api/account "$LOGIN_TOKEN" '')"
check "Get accounts" 200 "$STATUS" "$BODY"

parse "$(apicall GET "/api/account/balance/$ACCT1" "$LOGIN_TOKEN" '')"
check "Get balance (should be 0)" 200 "$STATUS" "$BODY"
BAL=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('balance','?'))" 2>/dev/null)
echo "   Balance: $BAL"

parse "$(apicall GET /api/account/balance/000000000000000000000000 "$LOGIN_TOKEN" '')"
check "Get balance — non-existent account" 404 "$STATUS" "$BODY"

echo ""
echo "── Transaction Validation ──"

parse "$(apicall POST /api/transactions "$LOGIN_TOKEN" '{"fromAccount":"aaa"}')"
check "Transaction — missing fields" 400 "$STATUS" "$BODY"

parse "$(apicall POST /api/transactions "$LOGIN_TOKEN" '{"fromAccount":"'"$ACCT1"'","toAccount":"'"$ACCT1"'","amount":10,"idempotencyKey":"k_self"}')"
check "Transaction — same account" 400 "$STATUS" "$BODY"

parse "$(apicall POST /api/transactions "$LOGIN_TOKEN" '{"fromAccount":"'"$ACCT1"'","toAccount":"000000000000000000000000","amount":-5,"idempotencyKey":"k_neg"}')"
check "Transaction — negative amount" 400 "$STATUS" "$BODY"

# Create a 2nd account for transfer tests
parse "$(apicall POST /api/account "$LOGIN_TOKEN" '')"
ACCT2=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('account',{}).get('_id',''))" 2>/dev/null)
echo "   2nd Account for transfer tests: $ACCT2"

parse "$(apicall POST /api/transactions "$LOGIN_TOKEN" '{"fromAccount":"'"$ACCT1"'","toAccount":"'"$ACCT2"'","amount":100,"idempotencyKey":"k_insuf"}')"
check "Transaction — insufficient funds" 400 "$STATUS" "$BODY"

echo ""
echo "── Admin Route Protection ──"

parse "$(apicall POST /api/transactions/system/initial-funds "$LOGIN_TOKEN" '{"toAccount":"'"$ACCT1"'","amount":1000,"idempotencyKey":"k_admin1"}')"
check "Initial funds — non-admin (expect 403)" 403 "$STATUS" "$BODY"

echo ""
echo "── Logout & Token Blacklist ──"

parse "$(apicall POST /api/auth/logout "$LOGIN_TOKEN" '')"
check "Logout" 200 "$STATUS" "$BODY"

parse "$(apicall GET /api/account "$LOGIN_TOKEN" '')"
check "Protected route after logout (expect 401)" 401 "$STATUS" "$BODY"

parse "$(apicall POST /api/auth/logout "$LOGIN_TOKEN" '')"
check "Double logout — same token (expect 200)" 200 "$STATUS" "$BODY"

# Clean up
rm -f /tmp/_api_body.json

echo ""
echo "═══════════════════════════════════════════"
echo " RESULTS: $PASS passed, $FAIL failed out of $((PASS+FAIL)) tests"
echo "═══════════════════════════════════════════"
