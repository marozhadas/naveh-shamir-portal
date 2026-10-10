// notFound() thrown by src/app/businesses/[slug]/layout.tsx is handled by the boundary ABOVE that segment, so the same
// "העסק לא נמצא" screen the [slug] segment already had must live here too — it is the very same component.
export { default } from "./[slug]/not-found";
