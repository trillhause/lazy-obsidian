import {
  ActionPanel,
  Form,
  getSelectedText,
  Action,
  open,
  showToast,
  Toast,
  showHUD,
  Color,
  Icon,
  LocalStorage,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { GET_LINK_INFO_SCRIPT } from "./scripts/get-link";
import { useObsidianVaults } from "./utils/utils";

export default function Capture() {
  const { ready, vaults: allVaults } = useObsidianVaults();

  const [defaultVault, setDefaultVault] = useState<string | undefined>(undefined);
  const [defaultPath, setDefaultPath] = useState<string | undefined>(undefined);

  LocalStorage.getItem("vault").then((savedVault) => {
    if (savedVault) setDefaultVault(savedVault.toString());
  });

  LocalStorage.getItem("path").then((savedPath) => {
    if (savedPath) setDefaultPath(savedPath.toString());
    else setDefaultPath("/inbox");
  });
  const formatData = (content?: string, link?: string, highlight?: string) => {
    const data = [];
    if (content) {
      data.push(content);
    }
    if (link) {
      data.push(`[${resourceInfo}](${link})`);
    }
    if (highlight) {
      data.push(`> ${selectedText}`);
    }
    return data.join("\n\n");
  };

  async function createNewNote({ fileName, content, link, vault, path, highlight }: Form.Values) {
    try {
      await LocalStorage.setItem("vault", vault);
      await LocalStorage.setItem("path", path);

      const target = `obsidian://advanced-uri?vault=${encodeURIComponent(vault)}&filepath=${encodeURIComponent(
        path
      )}/${encodeURIComponent(fileName)}&data=${encodeURIComponent(formatData(content, link, highlight))}`;
      console.log(target);
      open(target);
      popToRoot();
      closeMainWindow();
      showHUD("Note Captured 🧞‍♂️", { clearRootSearch: true });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture. Try again",
      });
    }

    // Save vault and path to local storage
    await LocalStorage.setItem("vault", vault);
    await LocalStorage.setItem("path", path);

    const target = `obsidian://advanced-uri?vault=${encodeURIComponent(vault)}&filepath=${encodeURIComponent(
      path
    )}/${encodeURIComponent(fileName)}&data=${encodeURIComponent(formatData(content, link, highlight))}`;
    console.log(target);
    open(target);
    popToRoot();
    await showHUD("Note Captured 🧞‍♂️", { clearRootSearch: true });
  }

  const [selectedText, setSelectedText] = useState<string>("");
  const [includeHighlight, setIncludeHighlight] = useState<boolean>(true);

  const [selectedResource, setSelectedResource] = useState<string>("");
  const [resourceInfo, setResourceInfo] = useState<string>("");

  useEffect(() => {
    const setText = async () => {
      try {
        const linkInfoStr = await runAppleScript(GET_LINK_INFO_SCRIPT);
        const [url, title] = linkInfoStr.split("\t");
        if (url && title) {
          setSelectedResource(url);
          setResourceInfo(title);
          showToast({
            style: Toast.Style.Success,
            title: "Link captured",
          });
        } else {
          throw new Error("Failed to retrieve link information.");
        }
      } catch (error) {}

      try {
        const data = await getSelectedText();
        if (data) {
          setSelectedText(data);
          showToast({
            style: Toast.Style.Success,
            title: "Selected text captured",
          });
        }
      } catch (error) {}
    };

    setText();
  }, []);

  return (
    <>
      <Form
        navigationTitle={"Smart Capture"}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Capture" onSubmit={createNewNote} />
          </ActionPanel>
        }
      >
        {ready && allVaults.length > 1 && (
          <Form.Dropdown id="vault" title="Vault" defaultValue={defaultVault}>
            {allVaults.map((vault) => (
              <Form.Dropdown.Item key={vault.key} value={vault.name} title={vault.name} icon="🧳" />
            ))}
          </Form.Dropdown>
        )}
        {ready && (
          <Form.TextField
            id="path"
            title="Storage Path"
            defaultValue={defaultPath}
            info="Path where newly captured notes will be saved"
          />
        )}

        <Form.TextField title="Title" id="fileName" placeholder="Title for the resource" autoFocus />

        {selectedText && (
          <Form.Checkbox
            id="highlight"
            title="Include Highlight"
            label=""
            value={includeHighlight}
            onChange={setIncludeHighlight}
          />
        )}
        <Form.TextArea title="Note" id="content" placeholder={"Notes about the resource"} />
        {selectedResource && resourceInfo && (
          <Form.TagPicker id="link" title="Link" defaultValue={[selectedResource]}>
            <Form.TagPicker.Item
              value={selectedResource}
              title={resourceInfo}
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
            />
          </Form.TagPicker>
        )}
        {selectedText && includeHighlight && <Form.Description title="Highlight" text={selectedText} />}
      </Form>
    </>
  );
}
