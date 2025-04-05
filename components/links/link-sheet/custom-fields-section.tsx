import { useEffect, useState, useCallback, useMemo } from "react";

import { SettingsIcon } from "lucide-react";
import { motion } from "motion/react";

import { DEFAULT_LINK_TYPE } from "@/components/links/link-sheet";
import { Button } from "@/components/ui/button";

import { FADE_IN_ANIMATION_SETTINGS } from "@/lib/constants";

import { CustomFieldData } from "./custom-fields-panel";
import CustomFieldsPanel from "./custom-fields-panel";
import LinkItem from "./link-item";
import { LinkUpgradeOptions } from "./link-options";
import { LinkPreset } from "@prisma/client";

export default function CustomFieldsSection({
  data,
  setData,
  isAllowed,
  handleUpgradeStateChange,
  presets,
}: {
  data: DEFAULT_LINK_TYPE;
  setData: React.Dispatch<React.SetStateAction<DEFAULT_LINK_TYPE>>;
  isAllowed: boolean;
  handleUpgradeStateChange: (options: LinkUpgradeOptions) => void;
    presets: LinkPreset | null;
}) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isAllowed && presets?.watermarkConfig) {
      setEnabled(true);
      setData((prevData) => ({
        ...prevData,
        customFields: presets.customFields ? JSON.parse(presets.customFields as string) as CustomFieldData[] : [],
      }));
    }
  }, [presets, isAllowed]);

  useEffect(() => {
    const hasCustomFields = data.customFields.length > 0;
    if (enabled !== hasCustomFields) {
      setEnabled(hasCustomFields);
    }
  }, [data.customFields, enabled]);

  const handleCustomFieldsToggle = useCallback(() => {
    const updatedEnabled = !enabled;
    setData(prevData => ({
      ...prevData,
      customFields: updatedEnabled
        ? [
          {
            type: "SHORT_TEXT",
            identifier: "",
            label: "",
            placeholder: "",
            required: false,
            disabled: false,
            orderIndex: 0,
          },
        ]
        : [],
    }));
    setEnabled(updatedEnabled);
  }, [enabled, setData]);

  const handleConfigSave = useCallback((fields: CustomFieldData[]) => {
    setData(prevData => ({
      ...prevData,
      customFields: fields,
    }));
  }, [setData]);

  const memoizedFields = useMemo(() => data.customFields || [], [data.customFields]);

  return (
    <div className="pb-5">
      <LinkItem
        title="Custom Fields"
        tooltipContent="Add custom fields to collect additional information from viewers"
        enabled={enabled}
        action={handleCustomFieldsToggle}
        isAllowed={isAllowed}
        requiredPlan="business"
        upgradeAction={() =>
          handleUpgradeStateChange({
            state: true,
            trigger: "custom_fields",
            plan: "Business",
          })
        }
      />

      {enabled && (
        <motion.div
          className="relative mt-4 space-y-3"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <div className="mt-2 flex w-full items-center justify-between">
            <div className="space-y-1">
              {memoizedFields.map((field) => (
                <p
                  key={field.identifier || field.orderIndex}
                  className="text-sm text-muted-foreground"
                >
                  {field.orderIndex + 1}. {field.label || "Untitled Field"}
                  {field.required && (
                    <span className="italic"> (required)</span>
                  )}
                </p>
              ))}
            </div>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsConfigOpen(true);
              }}
              variant="outline"
              className="h-8"
              size="sm"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Configure
            </Button>
          </div>
        </motion.div>
      )}

      <CustomFieldsPanel
        fields={memoizedFields}
        onChange={handleConfigSave}
        isConfigOpen={isConfigOpen}
        setIsConfigOpen={setIsConfigOpen}
      />
    </div>
  );
};