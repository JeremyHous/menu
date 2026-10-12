# Next.js: Create a Page Component

Here's the current Next.js documentation on creating pages:

A page is UI that is rendered on a specific route. To create a page, add a page file inside the app directory and default export a React component. For example, to create an index page (/):

```tsx
// app/page.tsx
export default function Page() {
  return <h1>Hello Next.js!</h1>
}
```

Source: https://nextjs.org/docs/app/getting-started/layouts-and-pages
