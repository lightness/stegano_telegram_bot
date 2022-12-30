const Jimp = require('jimp');
const TeleBot = require('telebot');
const { Encryptor } = require('stegano');

const bot = new TeleBot({
  token: process.env.TELEGRAM_TOKEN,
});

const depthMap = new Map();

bot.on(['/start', '/hello'], (msg) => {
  console.log(msg);
  bot.sendMessage(msg.from.id, `Hi, ${msg.chat.username}!`);
  bot.sendMessage(msg.from.id, `I'm Contentify bot`);
  bot.sendMessage(msg.from.id, `I can hide your secret text in image`);
  bot.sendMessage(msg.from.id, `Just send me a PNG file (as a file, NOT PHOTO). Leave your secret text in caption`);
});

const encryptor = new Encryptor();

bot.on(/\/setdepth (\d)/, (msg, props) => {
  const depth = Number(props.match[1]);

  if (depth >= 1 && depth <= 7) {
    depthMap.set(msg.from.id, depth);
    bot.sendMessage(msg.from.id, `Depth set to ${depth}`);
  } else {
    bot.sendMessage(msg.from.id, `Depth must be in range [1,7]`);
  }
});

bot.on(['forward'], (msg) => {
  extract(msg, msg.document.file_id);
});

function getFile(fileId) {
  return bot.getFile(fileId)
    .then((fileData) => Jimp.read(fileData.fileLink));
}

function inject(msg, imageFileId, secret) {
  const depth = depthMap.get(msg.from.id) || 1;
  
  bot.sendMessage(msg.from.id, `Wait a bit. I'm injecting your secret...`)
    .then(() => getFile(imageFileId))
    .then((file) => {
      const jimp = encryptor.encrypt(file, secret, depth);

      return jimp.getBufferAsync(Jimp.MIME_PNG);
    })
    .then((buffer) => bot.sendDocument(msg.from.id, buffer, { fileName: msg.document.file_name }))
    .then(() => bot.sendMessage(msg.from.id, `Done! It's not the same image`))
    .then(() => bot.sendMessage(msg.from.id, `You can share it with anyone or send it back to me WITHOUT CAPTION.`));
}

function extract(msg, imageFileId) {
  bot.sendMessage(msg.from.id, 'Wait a bit. Extracting secret...')
    .then(() => getFile(imageFileId))
    .then((file) => {
      const secret = encryptor.decrypt(file);

      return bot.sendMessage(msg.from.id, 'Secret extracted')
        .then(() => bot.sendMessage(msg.from.id, secret));
    });
}

bot.on(['document'], (msg) => {
  if (msg.caption) {
    // inject
    inject(msg, msg.document.file_id, msg.caption);
  } else {
    // extract
    extract(msg, msg.document.file_id);
  }
});

// start polling
bot.start();

console.log('Stegano bot started!')