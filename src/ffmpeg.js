const { writeFile, unlink, rename } = require('fs').promises;
const execa = require('execa');
const { join } = require('path');
const { createSilent, concatTracks } = require('./tracks');

const getCodecArgs = ({ remuxOnly }) => (remuxOnly ? [
  '-c', 'copy',
] : [
  '-c:v', 'libx264',
  '-crf', '17', // Visually "lossless"
  '-preset:v', 'ultrafast', // We don't care about file size here, but speed 🔥
]);

async function concatParts({ ffmpegPath,gpuBrand, paths, concatFilePath, finalOutPath, remuxOnly }) {
  // https://superuser.com/questions/787064/filename-quoting-in-ffmpeg-concat
  const concatTxt = paths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(concatFilePath, concatTxt);

  await execa(ffmpegPath, [
    // https://blog.yo1.dog/fix-for-ffmpeg-protocol-not-on-whitelist-error-for-urls/
    '-f', 'concat', '-safe', '0', '-protocol_whitelist', 'file,pipe',
    '-i', concatFilePath,

    '-threads', '0',

    ...getCodecArgs({ remuxOnly }),

    // '-vf', 'scale=1920:-2',

    '-movflags', '+faststart',
    '-y', finalOutPath,
  ]);
}

// https://superuser.com/questions/585798/ffmpeg-slideshow-piping-input-and-output-for-image-stream
function createOutputFfmpeg({ puppeteerCaptureFormat, customOutputFfmpegArgs, ffmpegPath, fps, outPath, log = false }) {
  let gpu;

  return execa(ffmpegPath, [
    '-f', 'image2pipe', '-r', fps,
    ...(puppeteerCaptureFormat === 'jpeg' ? ['-c:v', 'mjpeg'] : ['-c:v', 'png']),
    '-i', '-',

    // This can used to test/trigger the process hanging if stdout/stderr streams are not read (causes EPIPE)
    // '-loglevel', 'trace',

    ...(customOutputFfmpegArgs || getCodecArgs({ remuxOnly: true })),

    '-y', outPath,
  ], {
    encoding: null, buffer: false, stdin: 'pipe', stdout: log ? process.stdout : 'ignore', stderr: log ? process.stderr : 'ignore',
  });
}

const cleanTemp = async (temps) => {
  for (const temp of temps) {
    try {
      await unlink(temp);
    } catch (e) {

    }
  }
};
async function concatAudiosList({ ffmpegPath, rawOutput, audios, videoPath, tempDir }) {
  const tracksFiles = await createSilent({ tempDir, audios, ffmpegPath });
  // Create a list of audios for FFmpeg
  const concatAudioPath = await concatTracks({ tracksFiles, tempDir, ffmpegPath });
  const concatVideoPath = join(tempDir, `merge_videos${new Date().getTime()}.${rawOutput ? '.mkv' : '.mp4'}`);
  const commandAddVideo = `${ffmpegPath} -y -i ${videoPath} -i ${concatAudioPath} -c copy ${concatVideoPath}`;
  await execa(commandAddVideo, { shell: true });
  await cleanTemp([concatAudioPath]);
  try {
    await unlink(videoPath);
    await rename(concatVideoPath, videoPath);
  } catch (e) {

  }
}

module.exports = {
  getCodecArgs,
  concatParts,
  createOutputFfmpeg,
  concatAudiosList,
};
