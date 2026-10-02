import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { legalDocuments, type LegalDocumentType } from "./legal-content";

export function LegalDocumentDialog({ document, onOpenChange }: { document: LegalDocumentType | null; onOpenChange: (open: boolean) => void }) {
  const content = document ? legalDocuments[document] : null;
  return <Dialog open={Boolean(content)} onOpenChange={onOpenChange}>{content && <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{content.title}</DialogTitle><DialogDescription>Última atualização: {content.updatedAt}</DialogDescription></DialogHeader><div className="space-y-5 text-sm leading-6 text-muted-foreground"><p>{content.intro}</p>{content.sections.map(([title, body]) => <section key={title}><h2 className="font-semibold text-foreground">{title}</h2><p className="mt-1">{body}</p></section>)}</div></DialogContent>}</Dialog>;
}
