# Keeping Fit

אפליקציית ווב לחדר הכושר: ארבע הצעות לתרגיל הבא לפי שלב האימון (A, B, C או גוף מלא), הסבר לכל תרגיל, מפת שרירים ואנימציה של התנועה.

האתר: https://keeping-fit.salvinorinab.workers.dev/

## מבנה
- `index.html` – כל האפליקציה (HTML, CSS ו-JavaScript בקובץ אחד)
- `manifest.webmanifest` – הגדרות ההתקנה למסך הבית
- `sw.js` – עבודה בלי אינטרנט
- `icons/`, `og-image.png` – אייקונים ותמונת התצוגה המקדימה לשיתוף
- `wrangler.jsonc`, `.assetsignore` – פרסום ב-Cloudflare (מה עולה לאתר ומה נשאר רק בקוד)
- `analytics/` – Worker פרטי שקורא את נתוני הכניסות

## עדכון
עורכים את `index.html`, מריצים `npx wrangler deploy` בתיקייה הראשית ודוחפים ל-`main`. אם משנים קבצים שנשמרים במטמון (אייקונים, manifest), מעלים את `VERSION` ב-`sw.js`.
