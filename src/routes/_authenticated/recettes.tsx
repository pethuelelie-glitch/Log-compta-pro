import { createFileRoute } from "@tanstack/react-router";
import { TransactionPage } from "@/components/TransactionPage";

export const Route = createFileRoute("/_authenticated/recettes")({
  component: () => <TransactionPage kind="recettes" title="Recettes" />,
  ssr: false,
});
