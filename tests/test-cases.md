# ClassPing Guardian test cases

| ID | Area | Scenario | Expected result |
| --- | --- | --- | --- |
| AUTH-01 | Login | Submit with an empty email or password | The form shows “Email dan kata sandi wajib diisi.” and does not call the API. |
| AUTH-02 | Login | Submit valid credentials and receive HTTP 200 | The user is redirected to `/dashboard` and the router refreshes. |
| AUTH-03 | Login | API returns an error detail | The returned detail is shown as an accessible alert. |
| AUTH-04 | Login | Toggle password visibility | The password input changes between `password` and `text`. |
| AUTH-05 | Session | Visit `/dashboard` without both auth cookies | The request redirects to `/login?next=/dashboard`. |
| AUTH-06 | Session | Visit `/login` with both auth cookies | The request redirects to `/dashboard`. |
| DATA-01 | Child switcher | Select Alya or Jisindo in the family menu | Navigation preserves the current route and adds the selected `child` query. |
| DATA-02 | Activities | Search for a title or summary fragment | Only matching activity cards remain visible. |
| DATA-03 | Activities | Move to the next carousel slide | The emoji, counter, and active dot change to slide 2. |
| DATA-04 | Assessments | Search by report period | Only reports for the matching period remain visible. |
| DATA-05 | Payments | Open a paid invoice | The receipt dialog shows the invoice amount, method, and payment date. |
| SETTINGS-01 | Notifications | Toggle a notification setting | The switch state changes and the saved state is reset. |
| SETTINGS-02 | Notifications | Click “Simpan perubahan” | A success confirmation is displayed. |
| API-01 | Forgot password | Backend URL is not configured | The route returns HTTP 503 with a configuration detail. |
| API-02 | Logout | Logout with backend unavailable | The route still clears local auth cookies and returns success. |
| STYLE-01 | Layout | Render the dashboard at desktop width | Sidebar, top bar, content area, panels, and action buttons use the shared layout styles. |
| STYLE-02 | Responsive layout | Render the dashboard at mobile width | Desktop navigation collapses, the mobile menu is available, and content remains readable without horizontal overflow. |
| STYLE-03 | Accessibility | Navigate controls using the keyboard | Interactive controls expose a visible focus indicator. |
| STYLE-04 | Activity cards | Render each activity tone | Peach, mint, lavender, and blue cards use distinct visual treatments. |
| STYLE-05 | Reduced motion | Enable `prefers-reduced-motion: reduce` | Decorative transitions and animations are reduced or disabled. |
| PROXY-01 | Route protection | Open `/dashboard` without cookies | The request redirects to login and includes the complete original path in `next`. |
| PROXY-02 | Route protection | Open a nested dashboard route without cookies | The nested path is preserved in the login redirect. |
| PROXY-03 | Authenticated login | Open `/login` with both auth cookies | The request redirects to `/dashboard`. |
| PROXY-04 | Authenticated dashboard | Open `/dashboard` with both auth cookies | The request passes through to the requested page. |
| PROXY-05 | Partial session | Open `/login` with only one auth cookie | The request remains on the login page. |
| LOGIN-01 | Login API | Submit an empty email or password | The API returns HTTP 400 with a validation detail. |
| LOGIN-02 | Demo login | Submit the configured demo credentials | The API returns the demo identity and sets auth cookies. |
| LOGIN-03 | Demo login | Submit an incorrect demo password without a backend | The API returns HTTP 503 with a configuration detail. |
| LOGOUT-01 | Logout API | Logout with local cookies | The API returns success and clears all local auth cookies. |
| RESET-01 | Forgot password | Submit without backend configuration | The API returns HTTP 503 with a configuration detail. |
| RESET-02 | Forgot password | Submit with a configured backend | The request body is forwarded and the backend response is returned. |
| RESET-03 | Forgot password | Backend is unreachable | The API returns HTTP 502 with a connection error detail. |
| PAYMENT-01 | Payment proof | Open an unpaid invoice and click “Lanjutkan pembayaran” | The API-aligned payment dialog opens with invoice, method, amount, and proof fields. |
| PAYMENT-02 | Payment proof | Choose an unsupported file type or file over 10 MB | Submission is blocked with a validation message and no API request is made. |
| PAYMENT-03 | Payment proof | Submit a valid proof for a backend invoice | The file is presigned, uploaded, and submitted through `POST /api/payments/`. |
| PAYMENT-04 | Payment proof | Submit a static/demo invoice | The UI explains that a backend invoice ID is required instead of pretending the payment was sent. |

## Full feature acceptance matrix

| ID | Feature | Scenario | Expected result |
| --- | --- | --- | --- |
| E2E-01 | New visitor | Open `/dashboard` without a session | Redirects to `/login?next=/dashboard`; no protected content is exposed. |
| E2E-02 | Session | Authenticate successfully | Access and identity cookies are created; dashboard navigation becomes available. |
| E2E-03 | Session | Refresh a protected page with valid cookies | The user remains authenticated and the requested page loads. |
| E2E-04 | Session | Remove either auth cookie and revisit dashboard | Access is denied and the user is redirected to login. |
| E2E-05 | Session | Logout from any dashboard page | Cookies are cleared and the user is redirected to login. |
| E2E-06 | Login recovery | Open forgot password and submit a valid email | A success/error response is shown without exposing whether an account exists. |
| E2E-07 | Dashboard | Switch between Alya and Jisindo | Header, counts, activities, assessments, invoices, and notifications update to the selected child. |
| E2E-08 | Dashboard | Load the home page | Greeting, summary cards, recent activity, latest assessment, and payment status are visible. |
| E2E-09 | Activities | Search, change carousel slide, open detail, and download an activity | Results filter correctly, slide state changes, detail route opens, and an SVG download is triggered. |
| E2E-10 | Assessments | Search and open a report | Results filter correctly and the detail page displays period, teacher, note, and scores. |
| E2E-11 | Payments | Open unpaid, partial, and paid invoices | Each status displays the correct balance; paid invoices expose receipt details. |
| E2E-12 | Payments | Start a payment upload | File/type/size validation is shown and valid submission returns to the payment view with confirmation. |
| E2E-13 | Profile | Edit profile fields and linked-child information | Form validation works and saved values are reflected after submission. |
| E2E-14 | Settings | Toggle notification types/channels and save | Toggle state changes, save confirmation appears, and state remains visible. |
| E2E-15 | Contact | Open “Hubungi sekolah”, change category/child, submit | Suggested subject updates and a correctly populated `mailto:` draft opens. |
| E2E-16 | Authorization | Use an unsupported account role against backend login | API returns HTTP 403 and no auth cookies are issued. |
| E2E-17 | Authorization | Backend token has no user id | API returns HTTP 502 and no session is created. |
| E2E-18 | Authorization | Backend profile lookup fails | API returns HTTP 502 and no session is created. |
| E2E-19 | Responsive UI | Use dashboard at 1440px, 900px, 680px, and 430px widths | Navigation/layout adapt without horizontal overflow or clipped dialogs. |
| E2E-20 | Accessibility | Navigate all controls with keyboard and inspect dialogs | Focus is visible, dialogs have labels, buttons have accessible names, and focus does not disappear. |
| E2E-21 | Resilience | Backend login, logout, or reset endpoint is unavailable | User receives a useful error and local session cleanup still occurs where applicable. |
| E2E-22 | Data isolation | Change child while viewing each feature route | No activity, assessment, invoice, or notification from the previous child remains visible. |
