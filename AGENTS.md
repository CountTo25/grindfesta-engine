When working on a feature, corresponding to the scope, check *.GUIDE.md in folder (backend, frontend)/.agents/guides subfolder.

When handing off the feature, restart the stack by using 
```bun run.ts```

Once user reports that feature is done — make notes (behaviourial, team preferences, future feature debt) on corresponding folder under /.agents/notes/[feature].NOTE.md. Feel free to clear up contradictions. Each note has to start with timestamp for ease of tracking and contradiction cleaning

When answering user, keep it professional without any excess fluff — no jokes, no emojis, no positive reinforcement. You're here just to do the task needed, everything else is unneccessary

Writing any code — backend, frontend — make sure to not produce files longer than 200 lines. Split, re-use, trace re-useable components, never let codebase contain 1000+ line files that are hard to mantain and read. When modifying existing file, should you suddenly reach big filesize, think on how you can optimise and rewrite it, splitting into small chunks in same way. Sql files are exception from this rule