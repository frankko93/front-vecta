import { HelpCircle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Metric Tooltip - Shows explanation for metrics
 */
export function MetricTooltip({ title, description }: { title: string; description: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <HelpCircle className="ml-1 inline-block h-3 w-3 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="mb-1 font-semibold text-xs">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
