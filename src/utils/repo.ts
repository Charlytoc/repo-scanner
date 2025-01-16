import axios from "axios";
import { Octokit } from "octokit";
import { TFileSystemItem } from "../components/FileSystem/FileSystem";
import yaml from "js-yaml";

export const extendItems = (items: TFileSystemItem[]) => {
  return items.map((item) => ({
    ...item,
    selected: false,
  }));
};

export const buildRepoMap = async ({ githubUrl }: { githubUrl: string }) => {
  const repoMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

  if (!repoMatch) {
    throw new Error("Invalid GitHub URL");
  }

  const [_, owner, repo] = repoMatch;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

  const fetchFiles = async (url: string): Promise<any[]> => {
    try {
      const response = await axios.get(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      const files: any[] = [];

      for (const file of response.data) {
        if (file.type === "dir") {
          // Llama recursivamente para explorar el directorio
          const subFiles = await fetchFiles(file.url);
          files.push(...subFiles);
        } else {
          files.push(file); // Usa directamente el `path` de la API
        }
      }

      return files;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      } else {
        console.error("Unknown error occurred");
      }
      throw error;
    }
  };

  const files = await fetchFiles(apiUrl);
  return extendItems(files);
};

/**
 * Fetches the text content of a file from a GitHub raw URL.
 *
 * @param githubRawUrl - The GitHub raw URL of the file.
 * @returns The text content of the file.
 * @throws Error if the request fails or the URL is invalid.
 */
export const fetchFileContent = async (
  githubRawUrl: string
): Promise<string> => {
  // Validate the URL format
  if (!githubRawUrl.startsWith("https://raw.githubusercontent.com/")) {
    throw new Error("Invalid GitHub raw URL");
  }

  try {
    // Fetch the file content
    const response = await axios.get(githubRawUrl, {
      responseType: "text", // Ensure the response is treated as plain text
    });

    return response.data; // Return the text content
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching file content:", error.message);
    } else {
      console.error("Unknown error occurred while fetching file content");
    }
    throw error;
  }
};

import frontMatter from "front-matter";
/**
 * Parses a Markdown file with frontmatter using gray-matter.
 *
 * @param fileContent - The raw content of the Markdown file.
 * @returns An object containing the frontmatter data and the Markdown content.
 */
export const extractFrontMatter = (
  fileContent: string
): {
  frontmatter: any;
  content: string;
} => {
  try {
    const { attributes, body } = frontMatter(fileContent);

    return {
      frontmatter: attributes, // The frontmatter metadata as an object
      content: body, // The Markdown content as a string
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error parsing Markdown file:", error.message);
    } else {
      console.error("Unknown error occurred while parsing Markdown file");
    }
    throw error;
  }
};

const removeFrontMatter = (fileContent: string) => {
  let newFileContent = fileContent.replace(/^---\n(.*)\n---\n/, "");
  return newFileContent;
};

export const insertFrontMatter = (fileContent: string, frontmatter: any) => {
  const newFrontMatter = `---\n${yaml.dump(frontmatter)}---\n`;
  const contentAfterInsert = `${newFrontMatter}${removeFrontMatter(
    fileContent
  )}`;
  // console.table({
  //   before: fileContent,
  //   after: contentAfterInsert,
  // });
  return contentAfterInsert;
};
/**
 * Commits multiple file changes to a GitHub repository.
 *
 * @param owner - The owner of the repository (username or organization).
 * @param repo - The name of the repository.
 * @param branch - The branch where the commit will be made.
 * @param files - An array of files to update or create.
 * @param message - The commit message.
 * @param token - Your GitHub personal access token.
 */

export const commitMultipleFilesToGitHub = async ({
  owner,
  repo,
  branch,
  files,
  message,
  token,
}: {
  owner: string;
  repo: string;
  branch: string;
  files: { path: string; content: string }[]; // File paths and their content
  message: string;
  token: string;
}) => {
  const octokit = new Octokit({
    auth: token,
  });
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    // console.log("Reference data:", refData);

    const commitSha = refData.object.sha;

    // Step 2: Get the commit object
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    // console.log("Commit data:", commitData);

    const treeSha = commitData.tree.sha;

    // Step 3: Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: file.content, // Encode content in Base64 using btoa
          encoding: "utf-8",
        });

        return { path: file.path, ...blobData };
      })
    );

    // Step 4: Create a new tree with the blobs
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      })),
    });

    // Step 5: Create a new commit
    const { data: newCommitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [commitSha],
    });

    // Step 6: Update the reference to point to the new commit
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitData.sha,
    });

    console.log("Commit with multiple files successfully created!");
  } catch (error) {
    console.error(
      "Error creating commit:",
      // @ts-ignore
      error.response?.data || error.message
    );
  }
};
