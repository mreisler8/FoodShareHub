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
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
