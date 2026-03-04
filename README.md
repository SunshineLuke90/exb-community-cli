# ExB Community CLI

A simple, lightweight command line interface to make using Experience Builder Developer Edition easier for new developers, looking to add widgets to their collection.

## Using this CLI

The ExB Community CLI has a few tools to make it easy to install, update, remove, and search for Experience Builder widgets that have been posted on NPM. Installing the CLI is as simple as running `npm install exb-community-cli` in your client directory of your Experience Builder application. To then run commands, the format is `npx exb [command]`. If you don't want to prefix every command with npx, you can install the exb-community-cli globally, by running `npm install -g exb-community-cli` (Recommended). For information on the commands that exist, run `npx exb help`, and commands, arguments, and descriptions will be listed.

Additionally, this CLI makes it easy to get up and running with Experience Builder, requiring a single command to install and run Experience Builder Developer Edition, making it easier than ever to get started. Just install the CLI globally `npm install -g exb-community-cli` and then run `exb dev-setup`. The tool will give you a few prompts to get started, and you'll end up with a fully functional install.

When using any of the ExB Community CLI commands, the command needs to be run in the client directory of your Experience builder application (excluding dev-setup). If you don't, you will get the error `Error: Run this from the ExB client folder.`.

## Formatting widgets for NPM (And Best Practices)

To prepare your widget to be easily ingested by the ExB Community CLI, there are a few key steps to take.

1. Prepare your widget for NPM (Required)
   - The ExB Community CLI has a format tool, which you can use to quickly prepare your widget for publication, if it doesn't already have a package.json file. Before running this command, ensure your manifest.json file has been filled out completely.
   - If you are already using node in your widget (For using external libraries in your widget), ensure that the name in your package.json file is unique on NPM, and that the description is accurate. Also, please add the "exb-widget" keyword to your package.json file, to ensure that your widget can be easily found via the CLI.
2. Ensure your widget has a README.md file at the root, with a description of how it functions, how to use it, and who built it. If you have demo applications, add links to those demo applications!
3. Use a meaningful icon.svg. It's a small touch, but having a meaningful icon for other builders makes it much easier to build with.
4. Add a help document to your widget. Again, another really small touch, but having a help document for users to be able to open up and get a walkthrough of how to use the widget in practice really does help, beyond providing a README.md file. To prevent from reinventing the wheel, if you already have a good README.md file, try converting it to an html file using [this free converter](https://www.netsmarter.com/md-to-html/).

## Automation

If you're like me, you probably don't want to re-publish your widget manually on NPM every time that you have an update. That'd be a pain right? Well, as long as you're using GitHub, I have a solution for you. _**GitHub Actions**_. You can use GitHub Actions to automate deployment to NPM using a fairly simple process, and you can find an example of a GitHub action, used to publish my widgets in a monorepo approach [here](https://github.com/SunshineLuke90/widgets/blob/master/.github/workflows/publish-widgets.yml).

If you are using automated deployment YAML for your Experience Builder installs, you might also want to make sure that the widgets you're using come along for the ride. This CLI has that in mind! To inline install a widget into your build pipeline, use `npx exb-community-cli install widgetname`. This will install the widget into your project. If you want to ensure that you always use the same version of the widget, simply add the version suffix ex `@1.5.3`.
