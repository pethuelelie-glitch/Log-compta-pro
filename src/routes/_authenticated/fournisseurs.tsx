import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/ContactPage";

export const Route = createFileRoute("/_authenticated/fournisseurs")({
  component: () => <ContactPage kind="fournisseurs" title="Fournisseurs" />,
  ssr: false,
});
