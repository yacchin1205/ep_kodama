# ep_kodama

ep_kodama is a plugin that can be added to etherpad to provide writing assistance with LLM.

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
