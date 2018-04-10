const mongoose = require('mongoose');
const jimp = require('jimp');
const uuid = require('uuid');
const multer = require('multer');
const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
      const isPhoto = file.mimetype.startsWith('image/');
      if(isPhoto) {
        next(null, true);
      } else {
        next({ message: 'That filetype isn\'t allowed!' }, false);
      }
    }
  };
const Store = mongoose.model('Store')

exports.homePage = (req, res) => {
    req.render('index', {
        name: 'Magazina'
    });
}

exports.addStore = (req, res) => {
    res.render('editStore', {
        title: 'Add Store'
    });
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip to the next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our filesystem, keep going!
  next();
};

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully created ${store.name} Care to leave a store review?`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', {title: 'Stores', stores});
}

exports.editStore = async (req, res) => {
    const store = await Store.findOne({
        _id: req.params.id
    });

    res.render('editStore', {title: 'Edit Store', store});
}

exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';

    const store = await Store.findOneAndUpdate({
        _id: req.params.id
    }, req.body, {
        new: true,
        runValidators: true
    }).exec();
    req.flash('success', `Succesfully updated ${store.name} <a href="/stores/${store.slug}">View Store</a>`)
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoresBySlug = async (req, res, next) => {
    const store = await Store.findOne({slug: req.params.slug});
    if (!store) {
        return next();
    }
    res.render('store', {store, title: store.name});
}

exports.getStoresByTag = async (req, res, next) => {
    const tag = req.params.tag;
    const tagQuery = tag || {$exists: true};
    const tagsPromise = Store.getTagsList();
    const storePromise = Store.find({tags: tag});
    const [tags, stores] = await Promise.all([tagsPromise, storePromise]);

    res.render('tag', {tags, title: 'Tags', stores});
}