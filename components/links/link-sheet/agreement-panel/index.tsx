import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";

import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import { mutate } from "swr";

import DocumentUpload from "@/components/document-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  DocumentData,
  createAgreementDocument,
} from "@/lib/documents/create-document";
import { putFile } from "@/lib/files/put-file";
import { getSupportedContentType } from "@/lib/utils/get-content-type";

import LinkItem from "../link-item";

export default function AgreementSheet({
  defaultData,
  isOpen,
  setIsOpen,
  isOnlyView = false,
  onClose,
}: {
    defaultData?: { name: string; link: string; requireName: boolean } | null;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
    isOnlyView?: boolean;
    onClose?: () => void;
}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const [data, setData] = useState({ name: "", link: "", requireName: true });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useEffect(() => {
    if (defaultData) {
      setData({
        name: defaultData?.name || "",
        link: defaultData?.link || "",
        requireName: defaultData?.requireName || true,
      });
    }
  }, [defaultData]);

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    setData({ name: "", link: "", requireName: true });
    setCurrentFile(null);
    setIsLoading(false);
    if (onClose) {
      onClose();
    }
  };

  const handleBrowserUpload = async () => {
    // event.preventDefault();
    // event.stopPropagation();
    if (isOnlyView) {
      handleClose(false);
      toast.error("Cannot upload file in view mode!");
      return;
    }
    // Check if the file is chosen
    if (!currentFile) {
      toast.error("Please select a file to upload.");
      return; // prevent form from submitting
    }

    try {
      setIsLoading(true);

      const contentType = currentFile.type;
      const supportedFileType = getSupportedContentType(contentType);

      if (
        !supportedFileType ||
        (supportedFileType !== "pdf" && supportedFileType !== "docs")
      ) {
        toast.error(
          "Unsupported file format. Please upload a PDF or Word file.",
        );
        return;
      }

      const { type, data, numPages, fileSize } = await putFile({
        file: currentFile,
        teamId: teamId!,
      });

      const documentData: DocumentData = {
        name: currentFile.name,
        key: data!,
        storageType: type!,
        contentType: contentType,
        supportedFileType: supportedFileType,
        fileSize: fileSize,
      };
      // create a document in the database
      const response = await createAgreementDocument({
        documentData,
        teamId: teamId!,
        numPages,
      });

      if (response) {
        const document = await response.json();
        const linkId = document.links[0].id;
        setData((prevData) => ({
          ...prevData,
          link: "https://www.papermark.com/view/" + linkId,
        }));
      }
    } catch (error) {
      console.error("An error occurred while uploading the file: ", error);
    } finally {
      setCurrentFile(null);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOnlyView) {
      handleClose(false);
      toast.error("Agreement cannot be created in view mode");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/agreements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
        }),
      });

      if (!response.ok) {
        // handle error with toast message
        toast.error("Error creating agreement");
        return;
      }

      // Update the agreements list
      mutate(`/api/teams/${teamId}/agreements`);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setData({ name: "", link: "", requireName: true });
    }
  };

  useEffect(() => {
    if (currentFile) {
      handleBrowserUpload();
    }
  }, [currentFile]);

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="flex h-full w-[85%] flex-col justify-between bg-background px-4 text-foreground sm:w-[500px] md:px-5">
        <SheetHeader className="text-start">
          <SheetTitle>{isOnlyView ? "View Agreement" : "Create a new agreement"}</SheetTitle>
          <SheetDescription>
            {isOnlyView
              ? "View the details of this agreement."
              : "An agreement is a special document that visitors must accept before accessing your link. You can create a new agreement here."
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form className="flex grow flex-col" onSubmit={handleSubmit}>
            <div className="flex-grow space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  className="flex w-full rounded-md border-0 bg-background py-1.5 text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-gray-400 sm:text-sm sm:leading-6"
                  id="name"
                  type="text"
                  name="name"
                  required
                  autoComplete="off"
                  data-1p-ignore
                  placeholder="Standard NDA"
                  value={data.name || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      name: e.target.value,
                    })
                  }
                  disabled={isOnlyView}
                />
              </div>

              <div>
                <LinkItem
                  title="Require viewer's name"
                  enabled={data.requireName}
                  action={() =>
                    setData({ ...data, requireName: !data.requireName })
                  }
                  isAllowed={!isOnlyView}
                />
              </div>

              <div className="space-y-4">
                <div className="w-full space-y-2">
                  <Label htmlFor="link">Link to an agreement</Label>
                  <Input
                    className="flex w-full rounded-md border-0 bg-background py-1.5 text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-gray-400 sm:text-sm sm:leading-6"
                    id="link"
                    type="url"
                    pattern="https://.*"
                    name="link"
                    required
                    autoComplete="off"
                    data-1p-ignore
                    placeholder="https://www.papermark.com/nda"
                    value={data.link || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        link: e.target.value,
                      })
                    }
                    onInvalid={(e) =>
                      e.currentTarget.setCustomValidity(
                        "Please enter a valid URL starting with https://",
                      )
                    }
                    disabled={isOnlyView}
                  />
                </div>

                {!isOnlyView ? <div className="space-y-12">
                  <div className="space-y-2 pb-6">
                    <Label>Or upload an agreement</Label>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      <DocumentUpload
                        currentFile={currentFile}
                        setCurrentFile={setCurrentFile}
                      />
                    </div>
                  </div>
                </div> : null}
              </div>
            </div>
            <SheetFooter className={`flex-shrink-0 ${isOnlyView ? "mt-6" : ""}`}>
              <div className="flex items-center">
                {isOnlyView ? (
                  <Button type="button" onClick={() => handleClose(false)}>
                    Close
                  </Button>
                ) : (
                    <Button type="submit" loading={isLoading}>
                      Create Agreement
                    </Button>
                )}
              </div>
            </SheetFooter>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
