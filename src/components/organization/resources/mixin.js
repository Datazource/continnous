import Firebase from '../../../firebase';

export default {
  created() {
    this.storageRef = Firebase.storage().ref();
  },
  methods: {
    createItem(id, data) {
      const item = Object.assign({}, data, { id });
      const createFileObject = (file) => {
        const fileObject = Object.assign({ src: undefined, preview: undefined }, file);
        ['src', 'preview'].forEach((key) => {
          const child = this.storageRef.child(file.id + (key === 'src' ? '' : '_' + key));
          child.getDownloadURL().then((url) => {
            fileObject[key] = url;
          }, () => {});
        });
        return fileObject;
      };
      if (item.image) {
        item.image = createFileObject(item.image);
      }
      return item;
    }
  },
};