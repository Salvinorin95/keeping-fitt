# Keeping Fit

אפליקציית ווב לחדר הכושר: ארבע הצעות לתרגיל הבא לפי שלב האימון (A, B, C או גוף מלא), הסבר לכל תרגיל, מפת שרירים ואנימציה של התנועה.

האתר: https://salvinorin95.github.io/keeping-fitt/

## מבנה
- `index.html` – כל האפליקציה (HTML, CSS ו-JavaScript בקובץ אחד)
- `manifest.webmanifest` – הגדרות ההתקנה למסך הבית
- `sw.js` – עבודה בלי אינטרנט
- `icons/`, `og-image.png` – אייקונים ותמונת התצוגה המקדימה לשיתוף

## עדכון
עורכים את `index.html` ודוחפים ל-`main`. אם משנים קבצים שנשמרים במטמון (אייקונים, manifest), מעלים את `VERSION` ב-`sw.js`.
