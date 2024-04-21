# ep_kodama

ep_kodama is a plugin that can be added to etherpad to provide writing assistance with LLM.

![screenshot](./screenshot.gif)

ep_kodama supports OpenAI as an LLM. Automatically guesses the continuation of a sentence and suggests candidate completions.
Once ep_kodama is activated and you type a sentence with Etherpad, it will automatically suggest a candidate to follow. If that suggestion is appropriate, you can use Shift+TAB to type it in.

ep_kodama provides the feature to all users of Etherpad, empowering collaborative document editing with real-time predictive typing.

# How to try

Use docker-compose to try ep_kodama. Run the container as described below and access http://localhost:9001 .
Then click the [New Pad] button to create a new page.

```
docker-compose build
docker-compose up -d
```

# How to install

## Install the ep_kodama Plugin on Etherpad

To install ep_kodama, first, you need to install etherpad. Once Etherpad is installed, navigate to the root directory of etherpad and run the following command:

```
pnpm i ep_kodama
```

Also, as a work-around for [known issue](https://github.com/yacchin1205/ep_kodama/issues/1), please do the following:

```
pnpm i web-streams-polyfill@3.3.3
```

## Configure the OpenAI API settings in the settings.json file

After installing ep_kodama, you need to configure the OpenAI API settings. Open the `settings.json` file located in the root directory of your Etherpad installation. Inside this file, find the `"ep_kodama"` section and add your OpenAI API key like so:

```
  "ep_kodama": {
    "api": "openai",
    "apiModel": {
      "default": "gpt-4",
      "forImage": "gpt-4-vision-preview"
    },
    "apiKey": "your-api-key"
  }
```

The ep_kodama section can be given the following settings:

- **api**: This indicates the language model provider. In this case, now it should be set to "openai."
- **apiModel**: This is where you specify the model to use. The default value is "gpt-3.5-turbo," but you can change this to other available models like "gpt-4." ep_kodama supports images uploaded by [ep_image_upload](https://www.npmjs.com/package/ep_image_upload) and allows the use of image-based model like "gpt-4-vision-preview" with forImage property when an image is attached as part of the input in Etherpad. This means ep_kodama can also understand and generate suggestions based on the content of images.
- **apiKey**: This is where you input your personal API key obtained from OpenAI, which allows you to use their language model.

Remember to replace `"your-api-key"` with your actual OpenAI API key. Save and close the file once you have added your key.

After install the plugin, restart the Etherpad service for the changes to take effect. Once restarted, the ep_kodama plugin should be active and ready to use.
