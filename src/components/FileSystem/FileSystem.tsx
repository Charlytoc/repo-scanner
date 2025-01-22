import { useEffect, useState } from "react";
import "./FileSystem.css";
import toast from "react-hot-toast";
import {
  commitMultipleFilesToGitHub,
  fetchFileContent,
  extractFrontMatter,
  insertFrontMatter,
  // buildRepoMap,
} from "../../utils/repo";
import { Modal } from "../Modal/Modal";
import { Textarea } from "../Textarea/Textarea";
import { useStore } from "../../utils/store";
import { useShallow } from "zustand/shallow";
import { generateAIDescription } from "../../utils/lib";
import { Button } from "../Button/Button";
// import { StorageManager } from "../../utils/storage";
import { SVGS } from "../../assets/svgs";

const getParentDirectory = (path: string) => {
  const lastSlashIndex = path.lastIndexOf("/");
  return lastSlashIndex === -1 ? "/" : path.slice(0, lastSlashIndex);
};

type TFilters = {
  extension: string;
  directories: string[];
};

export type TFileSystemItem = {
  name: string;
  path: string;
  type: string;
  children?: TFileSystemItem[];
  download_url: string | null;
  selected: boolean;
};
export const FileSystem = () => {
  const { repo, fetchRepo } = useStore(
    useShallow((state) => ({
      repo: state.repo,
      fetchRepo: state.fetchRepo,
    }))
  );

  const [innerRepoMap, setInnerRepoMap] = useState<TFileSystemItem[]>(
    repo.files
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TFilters>({
    extension: "",
    directories: [],
  });

  const handleExtensionFilter = (extension: string) => {
    setFilters({
      ...filters,
      extension,
    });
  };

  const handleSelectItem = (item: TFileSystemItem) => {
    setInnerRepoMap((prev) =>
      prev.map((i) => {
        if (i.path === item.path) {
          return { ...i, selected: !i.selected };
        }
        return i;
      })
    );
  };

  const groupByParentDirectory = (items: TFileSystemItem[]) => {
    const grouped: Record<string, TFileSystemItem[]> = {};

    items.forEach((item) => {
      const lastSlashIndex = item.path.lastIndexOf("/");
      const groupKey =
        lastSlashIndex === -1 ? "/" : item.path.slice(0, lastSlashIndex);
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      grouped[groupKey].push(item);
    });

    return grouped;
  };
  const renderGroupedItems = (
    groupedItems: Record<string, TFileSystemItem[]>
  ) => {
    return Object.entries(groupedItems).map(([group, items]) => (
      <Directory
        key={group}
        group={group}
        items={items}
        handleSelectItem={handleSelectItem}
      />
    ));
  };

  useEffect(() => {
    setInnerRepoMap(repo.files);
  }, [repo.files]);

  useEffect(() => {
    let filteredRepoMap = repo.files;

    if (filters.directories.length > 0) {
      filteredRepoMap = filteredRepoMap.filter((item) =>
        filters.directories.includes(getParentDirectory(item.path))
      );
    }

    if (filters.extension) {
      filteredRepoMap = filteredRepoMap.filter((item) =>
        item.name.endsWith(filters.extension)
      );
    }

    setInnerRepoMap(filteredRepoMap);
  }, [filters]);

  const handleSelectDirectory = (directory: string) => {
    const newFilters = {
      ...filters,
      directories: filters.directories.includes(directory)
        ? filters.directories.filter((d) => d !== directory)
        : [...filters.directories, directory],
    };
    setFilters(newFilters);
  };

  const groupedRepoMap = groupByParentDirectory(innerRepoMap);

  return (
    <div className="flex-y gap-small">
      <div className="flex-y gap-small padding-large">
        <RepoConfig />
        <div className="flex-x gap-small justify-center wrap-wrap">
          <Button
            className="button-medium"
            onClick={() => setInnerRepoMap(repo.files)}
          >
            Load all files
          </Button>
          <Button
            className="button-medium"
            onClick={() => {
              setInnerRepoMap(
                innerRepoMap.map((item) => ({ ...item, selected: true }))
              );
            }}
          >
            Select all
          </Button>
          {innerRepoMap.filter((item) => item.selected).length > 0 && (
            <Button
              className="button-medium"
              onClick={() => {
                setInnerRepoMap(
                  innerRepoMap.map((item) => ({ ...item, selected: false }))
                );
              }}
            >
              Unselect all
            </Button>
          )}
          <Button
            className="button-medium"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </Button>
        </div>

        {showFilters && (
          <div className="flex-y gap-small bordered padding-large rounded-small">
            <h3 className="text-center">Filters</h3>
            <h4>By extension</h4>
            <input
              type="text"
              value={filters.extension}
              name="extensionFilter"
              placeholder="Extension"
              onChange={(e) => handleExtensionFilter(e.target.value)}
            />
            <h4>Directories</h4>
            <div className="flex-x gap-small wrap-wrap">
              {Object.keys(groupByParentDirectory(repo.files)).map((key) => (
                <Button
                  className={`button-medium ${
                    filters.directories.includes(key) ? "bg-accent" : ""
                  }`}
                  key={key}
                  onClick={() => handleSelectDirectory(key)}
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-y gap-small padding-large">
        {innerRepoMap.filter((item) => item.selected).length > 0 && (
          <BulkActions
            selectedItems={innerRepoMap.filter((item) => item.selected)}
          />
        )}
        {renderGroupedItems(groupedRepoMap)}
      </div>
    </div>
  );
};

const Directory = ({
  group,
  items,
  handleSelectItem,
}: {
  group: string;
  items: TFileSystemItem[];
  handleSelectItem: (item: TFileSystemItem) => void;
}) => {
  const [showItems, setShowItems] = useState(false);

  return (
    <div key={group} className="  rounded-small ">
      <h3
        className={`flex-x gap-small align-center  rounded-small fit-content padding-small w-100 ${
          showItems ? "bg-gray-light" : ""
        }`}
        onClick={() => setShowItems(!showItems)}
      >
        <div className="svg-container flex-x align-center justify-center">
          {SVGS.directory}
        </div>
        <span>{group}</span>
      </h3>
      {showItems && (
        <div className="flex-y gap-small padding-small">
          {items.map((item) => (
            <File
              key={item.path}
              item={item}
              onSelect={() => handleSelectItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const File = ({
  item,
  onSelect,
}: {
  item: TFileSystemItem;
  onSelect: () => void;
}) => {
  const [content, setContent] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {}, [item.download_url]);

  const handleEdit = () => {
    if (
      item.name.endsWith(".png") ||
      item.name.endsWith(".jpg") ||
      item.name.endsWith(".jpeg") ||
      item.name.endsWith(".gif")
    ) {
      window.open(item.download_url || "", "_blank");
      return;
    }

    if (!content) {
      fetchFileContent(item.download_url || "").then((content) => {
        setContent(content);
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  return (
    <div className={`flex-x gap-small align-center`}>
      <div
        className={`box-20 rounded-small pointer ${
          item.selected ? "bg-accent" : ""
        }`}
        onClick={onSelect}
      ></div>
      <p>{item.name}</p>
      {item.download_url && (
        <div className="flex-x gap-small">
          <Button onClick={handleEdit}>
            <div className="svg-container flex-x align-center justify-center">
              {SVGS.edit}
            </div>
          </Button>
          <Modal visible={visible} close={() => setVisible(false)}>
            <Editor
              item={item}
              content={content}
              onChange={(content) => setContent(content)}
              onSave={() => setVisible(false)}
            />
          </Modal>
        </div>
      )}
    </div>
  );
};

const getRepoSectionFromUrl = (url: string) => {
  if (!url) return { owner: "", repo: "" };

  const urlObj = new URL(url);
  const owner = urlObj.pathname.split("/")[1];
  const repo = urlObj.pathname.split("/")[2];
  return { owner, repo };
};

const RepoConfig = () => {
  const { repo, setRepo, fetchRepo } = useStore(
    useShallow((state) => ({
      repo: state.repo,
      setRepo: state.setRepo,
      fetchRepo: state.fetchRepo,
    }))
  );

  return (
    <div className="flex-y gap-small padding-small justify-center">
      <div className="flex-x gap-big align-center">
        <a href={repo.url} target="_blank">
          {repo.owner}/{getRepoSectionFromUrl(repo.url).repo}
        </a>
        <Button
          className="button-medium flex-x gap-small align-center padding-small"
          onClick={async () => {
            const tid = toast.loading("Syncing repo...");
            await fetchRepo(repo.url);
            toast.success("Repo synced", { id: tid });
          }}
        >
          <div className="svg-container flex-x align-center justify-center">
            {SVGS.reload}
          </div>
          <span>Sync</span>
        </Button>
      </div>

      {repo.branches.length > 0 && (
        <div className="flex-x gap-medium align-center">
          <h4>Branches</h4>
          {repo.branches.map((b) => (
            <Button
              key={b.name}
              onClick={() => setRepo({ ...repo, branch: b.name })}
              className={`padding-small ${
                b.name === repo.branch ? "bg-accent" : ""
              }`}
            >
              {b.name}
            </Button>
          ))}

          <span className="text-small">
            All commits will go to the branch <strong>{repo.branch}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

const Editor = ({
  item,
  content,
  onChange,
  onSave,
}: {
  item: TFileSystemItem;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
}) => {
  const { auth, repo } = useStore(
    useShallow((state) => ({
      auth: state.auth,
      repo: state.repo,
    }))
  );

  const [innerContent, setInnerContent] = useState(content);
  const [commitMessage, setCommitMessage] = useState("");

  const handleCommit = () => {
    const toastId = toast.loading("Committing file...");
    commitMultipleFilesToGitHub({
      owner: repo.owner || "",
      repo: getRepoSectionFromUrl(repo.url).repo || "",
      branch: repo.branch || "",
      files: [{ path: item.path, content: innerContent }],
      message: commitMessage,
      token: auth.token,
    });
    toast.success("File committed", { id: toastId });
  };

  return (
    <div className="editor flex-y gap-small">
      <div className="flex-y gap-small">
        <h2 className="text-center">{item.name}</h2>
        <div className="flex-x gap-small align-center justify-between">
          <h5>{item.path}</h5>
          <Button
            className="padding-small"
            onClick={() => window.open(item.download_url || "", "_blank")}
          >
            Open in browser
          </Button>
        </div>
      </div>
      <div className="flex-y gap-small">
        {/* <h3>Frontmatter</h3>
        <div className="flex-y gap-small">
          {
            // @ts-ignore
            Object.entries(parseMarkdownFile(content).frontmatter).map(
              ([key, value]) => (
                <div key={key}>
                  <p>
                    {key}: {String(value)}
                  </p>
                </div>
              )
            )
          }
        </div> */}
        <Textarea
          className="bg-primary padding-small"
          defaultValue={content}
          onChange={(newContent) => {
            setInnerContent(newContent);
            onChange(newContent);
          }}
        />
        <input
          type="text"
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
      </div>

      <div className="flex-x gap-small justify-center">
        <Button className="button-medium" onClick={onSave}>
          Save
        </Button>
        <Button className="button-medium" onClick={handleCommit}>
          Commit
        </Button>
      </div>
    </div>
  );
};

const BulkActions = ({
  selectedItems,
}: {
  selectedItems: TFileSystemItem[];
}) => {
  return (
    <div className="flex-y gap-small justify-center bordered padding-large rounded-small">
      <h3>Bulk actions</h3>
      <div className="flex-x gap-small align-center">
        <p>{selectedItems.length} selected</p>
        <RegenerateDescriptionModal selectedItems={selectedItems} />
      </div>
    </div>
  );
};

const isMarkdownFile = (item: TFileSystemItem) => {
  return item.name.endsWith(".md") || item.name.endsWith(".markdown");
};

const RegenerateDescriptionModal = ({
  selectedItems,
}: {
  selectedItems: TFileSystemItem[];
}) => {
  const { auth, repo } = useStore(
    useShallow((state) => ({
      auth: state.auth,
      repo: state.repo,
    }))
  );
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState({
    maxLength: 150,
    generateForAll: false,
    commitMessage: `Added description to ${selectedItems.length} files`,
  });

  useEffect(() => {
    setOptions({
      ...options,
      commitMessage: `Add description to ${selectedItems.length} files`,
    });
  }, [selectedItems]);

  const handleGenerateDescription = async () => {
    const toastId = toast.loading("Generating descriptions with Rigobot...");
    try {
      console.log("selectedItems", selectedItems);

      if (!auth.rigobot_token) {
        toast.error(
          "No Rigobot token provided yet. Please set one in the settings.",
          { id: toastId }
        );
        return;
      }

      if (!auth.token) {
        toast.error(
          "No GitHub token provided yet. Please set one in the settings.",
          { id: toastId }
        );
        return;
      }

      const files = await Promise.all(
        selectedItems.map(async (item) => {
          if (!isMarkdownFile(item)) {
            console.log("Skipping non-markdown file", item.path);
            return null;
          }
          const originalContent = await fetchFileContent(
            item.download_url || ""
          );
          const { frontmatter, content: body } =
            extractFrontMatter(originalContent);

          const TARGET_DESCRIPTION_LENGTH = options.maxLength;
          let shouldGenerateDescription = false;

          if (options.generateForAll) {
            shouldGenerateDescription = true;
          }

          if (
            frontmatter.description &&
            frontmatter.description.length < TARGET_DESCRIPTION_LENGTH
          ) {
            shouldGenerateDescription = true;
          }

          if (
            frontmatter.subtitle &&
            frontmatter.subtitle.length < TARGET_DESCRIPTION_LENGTH
          ) {
            shouldGenerateDescription = true;
          }

          if (
            !frontmatter ||
            (!frontmatter.description && !frontmatter.subtitle)
          ) {
            shouldGenerateDescription = true;
          }

          if (shouldGenerateDescription) {
            const rigoResponse = await generateAIDescription(
              auth.rigobot_token,
              {
                title: frontmatter.title || "PATH: " + item.path,
                content: originalContent,
              }
            );
            frontmatter.description = rigoResponse.answer;
            const newContent = insertFrontMatter(body, frontmatter);

            return {
              path: item.path,
              frontmatter,
              body,
              newContent,
            };
          } else {
            console.log("No need to generate description for", item.path);
            return null;
          }
        })
      );

      const filesToCommit = files.filter((file) => file !== null);

      if (filesToCommit.length === 0) {
        toast.error("No files to commit");
        return;
      }

      toast.loading(
        `${filesToCommit.length} files where descriptions were added about to be committed, this may take a while, don't close this window...`,
        {
          id: toastId,
        }
      );

      await commitMultipleFilesToGitHub({
        owner: repo.owner || "",
        repo: getRepoSectionFromUrl(repo.url).repo || "",
        branch: repo.branch || "",
        files: filesToCommit.map((file) => ({
          path: file?.path || "",
          content: file?.newContent || "",
        })),
        message: options.commitMessage,
        token: auth.token,
      });

      toast.success(`${filesToCommit.length} files committed.`, {
        id: toastId,
      });
    } catch (e) {
      toast.error(
        "Error committing files, check the console for more details",
        {
          id: toastId,
        }
      );
      console.error("ERROR GENERATING DESCRIPTIONS: ", e);
    }
  };

  return (
    <>
      <Button className="button-medium" onClick={() => setVisible(true)}>
        Regenerate description
      </Button>
      <Modal visible={visible} close={() => setVisible(false)}>
        <div className="flex-y gap-small">
          <h2>Regenerate frontmatter description</h2>
          <p>
            This action will regenerate the frontmatter.description for the
            <strong> {selectedItems.length} selected </strong> markdown files if
            they meet the following conditions:
          </p>
          <ul>
            <li>There is no frontmatter</li>
            <li>There is a frontmatter but no description or subtitle</li>
            <li>
              The description or subtitle is less than {options.maxLength}{" "}
              characters
            </li>
          </ul>
          <hr className="separator-large" />
          <h3>Options</h3>
          <div className="flex-x gap-small align-center padding-small">
            <label htmlFor="maxLength">Max length: </label>
            <input
              min={1}
              type="number"
              className="bg-primary padding-small"
              value={options.maxLength}
              onChange={(e) =>
                setOptions({
                  ...options,
                  maxLength: parseInt(e.target.value),
                })
              }
            />
            <p>characters</p>
          </div>

          <div className="flex-x gap-small align-center">
            <label htmlFor="commitMessage">Commit message: </label>
            <input
              type="text"
              className="bg-primary padding-small w-100"
              value={options.commitMessage}
              onChange={(e) =>
                setOptions({ ...options, commitMessage: e.target.value })
              }
            />
          </div>
          <div className="flex-x gap-small align-center">
            <label htmlFor="generateForAll">Generate for all: </label>
            <input
              type="checkbox"
              className="box-30"
              checked={options.generateForAll}
              onChange={() =>
                setOptions({
                  ...options,
                  generateForAll: !options.generateForAll,
                })
              }
            />
          </div>
          <div className="flex-x gap-small justify-center">
            <Button className="button-medium" onClick={() => setVisible(false)}>
              Cancel
            </Button>
            <Button
              className="button-medium"
              onClick={handleGenerateDescription}
            >
              Run
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
