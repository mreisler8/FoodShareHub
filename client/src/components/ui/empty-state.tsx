import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Link } from "wouter";

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
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-4">{description}</p>
      {actionLabel && (
        <div className="flex flex-col sm:flex-row gap-2">
          {actionHref ? (
            <Button asChild>
              <Link to={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
          {secondaryActionLabel && (
            secondaryActionHref ? (
              <Button variant="outline" asChild>
                <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}