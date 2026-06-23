# Supabase Edge Function Deployment Script
# Run this from the project root directory
# Requires: supabase CLI linked to project (supabase login + supabase link)
# Or set SUPABASE_ACCESS_TOKEN environment variable

Write-Host "=== Deploying Edge Functions ===" -ForegroundColor Cyan
Write-Host ""

# List of functions to deploy
$functions = @(
    "create-student-auth"
    "create-staff-account"
    "send-welcome-email"
    "send-signup-otp"
    "verify-signup-otp"
    "admin-reset-password"
    "seed-sample-accounts"
    "schoolpay-webhook"
    "schoolpay-sync"
)

# First, check if we're linked
$linked = $false
try {
    $check = supabase status 2>&1
    if ($check -match "Project URL") {
        $linked = $true
        Write-Host "Already linked to Supabase project" -ForegroundColor Green
    }
} catch {}

if (-not $linked) {
    Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
    supabase link --project-ref ljgbjiixeoxxqpejnmjx 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to link. Make sure you have run 'supabase login' first." -ForegroundColor Red
        Write-Host "You can also set SUPABASE_ACCESS_TOKEN and re-run." -ForegroundColor Yellow
        exit 1
    }
}

foreach ($fn in $functions) {
    Write-Host "Deploying $fn..." -ForegroundColor Yellow
    supabase functions deploy $fn 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $fn deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  $fn deployment FAILED!" -ForegroundColor Red
    }
}

# Set secrets for functions that need them
Write-Host ""
Write-Host "=== Setting Edge Function Secrets ===" -ForegroundColor Cyan
Write-Host "Make sure you have these secrets set in Supabase dashboard:"
Write-Host "  - RESEND_API_KEY (for send-welcome-email)"
Write-Host "  - MTN_CLIENT_ID, MTN_CLIENT_SECRET, MTN_SUBSCRIPTION_KEY, MTN_SHORT_CODE (for SMS)"
Write-Host "  - EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE (for WhatsApp)"
Write-Host ""
Write-Host "Or set them via CLI:"
Write-Host "  supabase secrets set RESEND_API_KEY=re_xxx"
Write-Host "  supabase secrets set MTN_CLIENT_ID=xxx MTN_CLIENT_SECRET=xxx"
Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
