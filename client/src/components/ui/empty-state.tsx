import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <Card className="w-full border-dashed">
      <CardHeader className="flex items-center space-y-5 pb-4">
        <div className="p-5 rounded-full bg-muted">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2 text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-center max-w-md mx-auto">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-2 pb-6">
        {(actionLabel || onAction) && (
          <Button
            onClick={onAction}
            {...(actionHref ? { asChild: true } : {})}
            className="w-full sm:w-auto"
          >
            {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
          </Button>
        )}
        {(secondaryActionLabel || onSecondaryAction) && (
          <Button
            onClick={onSecondaryAction}
            {...(secondaryActionHref ? { asChild: true } : {})}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {secondaryActionHref ? (
              <a href={secondaryActionHref}>{secondaryActionLabel}</a>
            ) : (
              secondaryActionLabel
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}