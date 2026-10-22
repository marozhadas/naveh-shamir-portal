# SUMIT test lab (local only)

כלי בדיקה מקומי מול **ארגון הבדיקות של SUMIT בלבד**, מעל התשתית הקיימת (`src/lib/sumit`). הוא לא חלק מהאפליקציה, לא נכנס ל-build, ולא רץ ב-`npm test` (רק בדיקות הבטיחות של הכלי עצמן רצות שם).

## מה הכלי מבטיח

- פונה רק ל-`https://api.sumit.co.il/` (כל כתובת אחרת נדחית לפני שליחה).
- כל בקשה ותשובה מתועדות **מצונזרות** (בלי מפתחות, מספר כרטיס, CVV, טוקן, ת.ז.) לתיקייה `scripts/sumit-lab/output/` (מחוץ ל-git). הקונסולה מקבלת סיכומים בלבד.
- תקרת קריאות לכל הרצה: 30 (`SUMIT_LAB_MAX_CALLS`, עד 100). בארגון הבדיקות יש בערך 400 קריאות API ו-100 פעולות בחודש.
- מספרי כרטיס מתקבלים **רק** מרשימת כרטיסי הבדיקה שמפורסמת ב-SUMIT. כרטיס אחר נדחה.
- צעד שמשנה נתונים ב-SUMIT דורש אישור **בשם** (`SUMIT_LAB_APPROVED`) ורק אחרי שהארגון אומת כארגון בדיקות באותה הרצה.
- אין Production: ההגדרה חייבת להיות `SUMIT_ENVIRONMENT=test` ו-`SUMIT_COMPANY_ID` זהה ל-`SUMIT_TEST_COMPANY_ID`.

## הגדרה (ב-`.env.local` בלבד - לא בצ'אט ולא ב-Vercel)

```
PAYMENTS_PROVIDER=sumit
SUMIT_ENVIRONMENT=test
SUMIT_COMPANY_ID=<CompanyID של ארגון הבדיקות>
SUMIT_TEST_COMPANY_ID=<אותו CompanyID>
SUMIT_API_KEY=<מפתח ה-API של ארגון הבדיקות>
SUMIT_API_PUBLIC_KEY=<המפתח הציבורי של ארגון הבדיקות>
```

את הערכים לוקחים מ-https://app.sumit.co.il/developers/keys/ **כשמחוברים לעסק הבדיקות** (השם שלו כולל "בדיקות").

## הרצה

```bash
# שלב 1: preflight (אופליין) + identity (קריאה בלבד) - בלי שום אישור
npm run sumit:lab
```

PowerShell, עם אישור צעדים (רק אחרי ש-identity עבר):

```powershell
$env:SUMIT_LAB_APPROVED = "save-card"
npm run sumit:lab
```

הצעדים (בשם): `save-card`, `null-token`, `replace-card`, `charge-saved`, `charge-vat-false`, `authorise-only`, `no-method`. הצעד `decline` חסום: SUMIT לא מתעדת תרחיש דחייה, ולכן לא מנחשים מספרי כרטיס.

## אימות שהמפתחות הם של ארגון הבדיקות

`preflight` בודק אופליין שההגדרה תואמת (סביבה test, אותו CompanyID). `identity` קורא **בלבד** את שם הארגון ואת המכסות, ועובר רק אם הסימון המתועד "בדיקות" מופיע בשם. הוא מדפיס PASS/FAIL ולא את השם או המפתחות.

## מה התוצאה לא מוכיחה

הרצה מוצלחת אחת לא מוכיחה שכל `BusinessError` או `ValidPayment: false` מבטיחים שלא בוצע חיוב. הטיפול השמרני באפליקציה (אין "failed", אין retry אוטומטי, `unconfirmed` שדורש reconciliation) נשאר עד שיש ראיה מספקת.
