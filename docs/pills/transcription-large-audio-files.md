# Transcribe large audio files with OpenAI's Whisper


## The Challenge

One of the valuable tools provided by OpenAI is [Whisper](https://openai.com/research/whisper). Whisper makes it incredibly easy to transcribe audio files through a simple HTTP request using its API. However, one of the primary challenges when performing this task is imposed by its [ability to process large inputs](https://platform.openai.com/docs/guides/speech-to-text/longer-inputs):

> By default, the Whisper API only supports files that are less than 25 MB. If you have an audio file that is longer than that, you will need to break it up into chunks of 25 MB's or less or used a compressed audio format.

OpenAI's documentation suggests a method to split the file into smaller-sized chunks based on time intervals (e.g., 10-minute chunks). However, this option may not be ideal in various cases, as you need to consider not only the file's duration but also its bitrate and other variables. Especially, given that the file upload limit is imposed in megabytes (MB).


## Splitting Audio Files into MBs

As an alternative, let's proceed with the following Node.js example where we will split an audio file into multiple 25 MB parts to minimize the number of requests to the Whisper API.

The size of an audio file is largely determined by its quality or bitrate. For this example, I will use an approximately 81 MB file with a bitrate of 128 kbps.

Next, let's take a look at the complete script, and then we will proceed to explain each part:

```js
const path = require('path');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const ffmpeg = require('fluent-ffmpeg');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: 'your-api-key',
});
const openai = new OpenAIApi(configuration);

const pipeline = util.promisify(stream.pipeline);

const getFileMetadata = (filePath) => {
  const ffprobe = util.promisify(ffmpeg.ffprobe);
  return ffprobe(filePath);
};

const getChunkLength = (bitRate) => {
  const MAX_SIZE_IN_MB = 25;
  const maxSizeInBits = MAX_SIZE_IN_MB * 1000 * 1000 * 8; // 25 * 1000 (to KB) * 1000 (to B) * 8 (to bits)
  const maxSegPerChunk = maxSizeInBits / bitRate;

  return Math.round(maxSegPerChunk);
};

const getNumberOfChunks = (duration, chunkLength) => Math.ceil(duration / chunkLength);

const generateTranscription = async ({
  inputFilePath, startSecond, length,
}) => {
  const mp3Stream = ffmpeg(inputFilePath)
    .inputFormat('mp3')
    .format('mp3')
    .setStartTime(startSecond)
    .setDuration(length)
    .pipe();
  mp3Stream.path = `file_${startSecond}.mp3`;

  const { data } = await openai.createTranscription(
    mp3Stream,
    'whisper-1',
    '',
    '',
    0,
    '',
    { maxBodyLength: Infinity, responseType: 'stream' },
  );

  return data;
};

const createTranscription = async ({
  inputFilePath, outputFilePath, chunkLength, numberOfChunks,
}) => {
  let startSecond = 0;
  for (let i = 0; i < numberOfChunks; i++) {
    const transcriptionStream = await generateTranscription({
      inputFilePath,
      startSecond,
      length: chunkLength,
    });

    await pipeline(
      transcriptionStream,
      fs.createWriteStream(`${outputFilePath}_${i + 1}.json`),
    );

    startSecond += chunkLength;
  }
};

(async () => {
  const inputFilePath = path.join(process.cwd(), 'path', 'to', 'file', 'file.mp3');
  const outputFilePath = path.join(process.cwd(), 'path', 'to', 'file', 'file_transcription');

  const metadata = await getFileMetadata(inputFilePath);
  const {
    format: {
      bit_rate: bitRate, // bits per second
      duration: durationInSecs,
    },
  } = metadata;

  const chunkLengthInSecs = getChunkLength(bitRate);
  const numberOfChunks = getNumberOfChunks(durationInSecs, chunkLengthInSecs);

  await createTranscription({
    inputFilePath,
    outputFilePath,
    chunkLength: chunkLengthInSecs,
    numberOfChunks,
  });
})();
```

## Each Part in Detail

Firstly, we make use of [`fluent-ffmpeg`](https://www.npmjs.com/package/fluent-ffmpeg), a JavaScript library that simplifies the usage of [`ffmpeg`](https://ffmpeg.org/) in our applications. Additionally, to minimize memory usage, we will rely on the [stream](https://nodejs.org/api/stream.html) package from Node.js. Lastly, we will use the OpenAI package to interact with their tools, in this particular case, the [Whisper API](https://platform.openai.com/docs/guides/speech-to-text):

```js
const path = require('path');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const ffmpeg = require('fluent-ffmpeg');
const { Configuration, OpenAIApi } = require('openai');
```

Next, we initialize the OpenAI component with our API Key:

```js
const configuration = new Configuration({
  apiKey: 'your-api-key',
});
const openai = new OpenAIApi(configuration);
```

To determine the bitrate and duration of our audio file, we will use `ffmpeg`.

```js
const getFileMetadata = (filePath) => {
  const ffprobe = util.promisify(ffmpeg.ffprobe);
  return ffprobe(filePath);
};
```

Next, we need to calculate the maximum number of seconds for our chunk, taking into account the 25 MB limit of Whisper and the bitrate of our file. The following function provides a straightforward way to do this, but it's important to note that a file's bitrate is not necessarily constant. It's essential to use consistent units when performing the conversion. In this case, `ffmpeg` returns the bitrate in bps (128,000, i.e., 128 kbps). To do this, we convert the 25 MB limit to bits and determine the maximum number of seconds our chunk will have.

```js
const getChunkLength = (bitRate) => {
  const MAX_SIZE_IN_MB = 25;
  const maxSizeInBits = MAX_SIZE_IN_MB * 1000 * 1000 * 8; // 25 * 1000 (to KB) * 1000 (to B) + 8 (to bits)
  const maxSegPerChunk = maxSizeInBits / bitRate;

  return Math.round(maxSegPerChunk);
};
```

Next, we split the file into smaller chunks based on the length of the chunk we have determined in the previous step and pipe it into `createTranscription`:

```js
const generateTranscription = async ({
  inputFilePath, startSecond, length,
}) => {
  const mp3Stream = ffmpeg(inputFilePath)
    .inputFormat('mp3')
    .format('mp3')
    .setStartTime(startSecond)
    .setDuration(length)
    .pipe();
  mp3Stream.path = `file_${startSecond}.mp3`;

  const { data } = await openai.createTranscription(
    mp3Stream,
    'whisper-1',
    '',
    '',
    0,
    '',
    { maxBodyLength: Infinity, responseType: 'stream' },
  );

  return data;
};
```

Several points to highlight in this function:

- The output of `ffmpeg`'s command in this case is a stream that we will be piped to the OpenAI component to obtain its transcription. It's important to set the stream's `path` (more info [here](https://github.com/openai/openai-node/issues/77)).
- The OpenAI library is a wrapper over [`Axios`](https://www.npmjs.com/package/axios), so in addition to the parameters specific to [`createTranscription`](https://platform.openai.com/docs/api-reference/audio/createTranscription), it also accepts optional parameters that are passed directly to the `Axios` instance.

Finally, to process all our chunks, we will use the following function:

```js
const createTranscription = async ({
  inputFilePath, outputFilePath, chunkLength, numberOfChunks,
}) => {
  let startSecond = 0;
  for (let i = 0; i < numberOfChunks; i++) {
    const transcriptionStream = await generateTranscription({
      inputFilePath,
      startSecond,
      length: chunkLength,
    });

    await pipeline(
      transcriptionStream,
      fs.createWriteStream(`${outputFilePath}_${i + 1}.json`),
    );

    startSecond += chunkLength;
  }
};
```

In this case, we could have used `Promise.all` to speed up the process since we know how many chunks we need to transcribe and their duration. However, we might want to use the `prompt` parameter to maintain context for the audio, as suggested in the OpenAI [documentation](https://platform.openai.com/docs/guides/speech-to-text/prompting). In that scenario, we might want to process each chunk sequentially to obtain the last 224 tokens from the previous fragment and provide them as context for the next one. If that's the case, we might also want to drop the `responseType: 'stream'` option in our call to `createTranscription` and obtain an object to facilitate the process.

## Considerations for Accurate Transcriptions

The Whisper API allows us to provide certain [parameters](https://platform.openai.com/docs/api-reference/audio) to `createTranscription` that can affect the transcription result, such as the `prompt`, `temperature`, and `language`. Additionally, we can get a more detailed output by setting the `response_format` parameter to `verbose_json`, which even includes timestamps for each transcribed audio fragment.

Finally, we should not forget the [recommendations](https://platform.openai.com/docs/guides/speech-to-text/prompting) from OpenAI regarding the prompt. As mentioned earlier, this parameter can be used to include context from the previous transcribed fragment to aid the model in the transcription process.

## Extra: Compress Your Audio File

You might be wondering why we didn't compress the audio file to begin with. If audio quality is not a concern in your case, you can reduce its bitrate before splitting it into chunks. To do this, you can use `ffmpeg` as follows:

```js
const compressFile = async (inputFilePath, outputFilePath) => {
  const mp3Stream = ffmpeg(inputFilePath)
    .inputFormat('mp3')
    .format('mp3')
    .audioBitrate(64)
    .pipe();

  const outputFileStream = fs.createWriteStream(outputFilePath);

  await pipeline(mp3Stream, outputFileStream);
};
```

In this case, we are transcoding the file with a bitrate of 64 kbps to an intermediate file for simplicity. However, by working with Node.js streams, you can pipe it directly into the split function.
