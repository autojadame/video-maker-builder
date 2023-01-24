const execa = require('execa');
const { join } = require('path');
const { writeFile } = require('fs').promises;

const fs = require('fs');

const concatTracks = async ({ tracksFiles, tempDir, ffmpegPath }) => {
  const concatFilePath = join(tempDir, 'concat_audios3.txt');
  const concatAudioPath = join(tempDir, `concat_audios${new Date().getTime()}.mp3`);
  const concatTxt = tracksFiles.map((audio) => `file '${audio.replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(concatFilePath, concatTxt);
  const commandFinal = `${ffmpegPath} -safe 0 -y -f concat -i ${concatFilePath} -c copy ${concatAudioPath}`;
  await execa(commandFinal, { shell: true });
  return concatAudioPath;
};
const createSilent = ({ tempDir, audios, ffmpegPath }) => Promise.all(audios.map(async (track) => {
  if (track.path === undefined) {
    const pathSilence = join(tempDir, `silence${track.duration}.mp3`);
    if (!fs.existsSync(pathSilence)) {
      const command = `${ffmpegPath} -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48048 -t ${track.duration / 1000} ${pathSilence}`;
      await execa(command, { shell: true });
    }
    return pathSilence;
  }
  return track.path;
}));

module.exports = {
  createSilent,
  concatTracks,
};
