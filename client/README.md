# Signature Engine Frontend

The user interface for the Signature Injection Engine, built with Next.js.

## Key Components

### `components/PdfViewer.tsx`
The core component responsible for:
-   Rendering PDFs using `react-pdf`.
-   Handling Drop events from `react-dnd`.
-   Managing the state of dropped fields (position, size, value, page).
-   Calculating coordinate conversions.

### `components/DraggableField.tsx`
A reusable component for the sidebar items that can be dragged onto the PDF.

## Configuration

Environment variables can be set in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Scripts

-   `npm run dev`: Start development server
-   `npm run build`: Build for production
-   `npm start`: Start production server
