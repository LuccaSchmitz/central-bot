import path from "path";
import { REST, Routes } from "discord.js";
import centralConfig from "@config/central-config";
import convertCommandToSlash from "@services/utils/convert-command-to-slash";
import fetchFiles from "@services/utils/fetch-files";
import logError from "@services/utils/log-error";

const commandsFolder = path.join(
  path.resolve(),
  process.env.NODE_ENV === "dev" ? "/src/commands" : "/dist/commands"
);

const commandsList: Command[] = [];

const fetch = async () => {
  try {
    const files = fetchFiles.fetch(commandsFolder);
    const importedFiles = await Promise.all(
      files.map(async (value) => {
        return await import(value);
      })
    );

    importedFiles.forEach((file) => {
      commandsList.push(file.command);
    });

    const TOKEN =
      process.env.NODE_ENV === "dev"
        ? process.env.DEV_BOT_TOKEN
        : process.env.PROD_BOT_TOKEN;

    const config =
      process.env.NODE_ENV === "dev" ? centralConfig.dev : centralConfig.prod;

    const rest = new REST({ version: config.central.version }).setToken(TOKEN);
    const commands = commandsList.map((c) =>
      convertCommandToSlash.convert(c).toJSON()
    );
    await rest.put(
      Routes.applicationGuildCommands(
        config.central.clientId,
        config.central.guildId
      ),
      {
        body: commands,
      }
    );

    console.log(
      "\x1b[42m%s\x1b[0m",
      `✔ [${commandsList.length}] All commands have been searched.`
    );
  } catch (error) {
    await logError.log(error);
  }
};

type FetchCommands = Service & {
  fetch: () => Promise<void>;
};

const fetchCommands: FetchCommands = {
  name: path.basename(__filename, path.extname(__filename)),
  description: "Service that searches for all bot commands.",
  fetch,
};

export { fetchCommands, commandsList };
