import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/ContactPage";

export const Route = createFileRoute("/_authenticated/clients")({
  component: () => <ContactPage kind="clients" title="Clients" />,
  ssr: false,
});
