<template>
  <resource-list
      :title="$t('search')"
      :organization="organization"
      :permissions="permissions"
      :type="type"
      :items="items"
      :personal="personal"
      additional-sort="_score"
  >
    <md-button
        slot="buttons"
        v-for="result in results"
        @click="$router.push({
          path: '/' + organization.key + '/search' +
            ((type && result.resource === (personal ? 'personal_' : '') + type) ? '' : '/' + result.resource.replace(/^(personal)_(.+)$/, '$2/$1')),
          query: $route.query
        })"
        :class="{'router-link-active': type && result.resource === (personal ? 'personal_' : '') + type}"
    >{{$t('resources.' + result.resource)}}</md-button>
  </resource-list>
</template>

<script>
  import Flashlight from '../../../models/Flashlight';
  import auth from '../../../auth';
  import mixin from './mixin';
  import ResourceList from './List';

  export default {
    mixins: [mixin],
    components: { ResourceList },
    props: ['organization', 'permissions'],
    data() {
      return {
        flashlight: new Flashlight(this.organization, this.permissions, auth),
        results: undefined,
        items: undefined,
        type: undefined,
        personal: false,
        sort: '_score',
        order: 'desc',
        q: undefined
      };
    },
    watch: {
      $route: {
        immediate: true,
        handler: 'search'
      },
      permissions: {
        deep: true,
        handler: 'search'
      },
    },
    methods: {
      search(reason) {
        this.$nextTick(() => {
          const query = this.$route.query;
          let search = false;
          ['sort', 'order', 'q'].forEach((key) => {
            if (query[key] && query[key] !== this[key]) {
              this[key] = query[key];
              search = true;
            }
          });
          if (this.q) {
            if (search || reason === this.permissions) {
              this.flashlight.search({ q: this.q, sort: this.sort + ':' + this.order }, '*').then((results) => {
                this.results = results;
                if (this.type && !results.find(
                    result => result.resource === (this.personal ? 'personal_' : '') + this.type
                  )) {
                  this.$router.replace({ path: '/' + this.organization.key + '/search', query });
                  return;
                }
                this.updateItems();
                this.$emit('search-results', results);
              });
            }
          } else {
            this.results = undefined;
            this.items = undefined;
          }
          const params = this.$route.params;
          if (params.type !== this.type || !!params.personal !== this.personal) {
            this.type = params.type;
            this.personal = !!params.personal;
            if (this.results) {
              this.updateItems();
            }
          }
        });
      },
      updateItems() {
        const order = {};
        const items = [];
        this.results.forEach((result) => {
          const resource = result.resource.replace(/^personal_/, '');
          const personal = result.resource.indexOf('personal_') === 0;
          result.hits.forEach((hit) => {
            /* eslint-disable no-underscore-dangle */
            if (!this.type || (this.type === resource && this.personal === personal)) {
              const item = this.createItem(hit._id, hit._source, resource, personal);
              order[item.id] = this.sort === '_score' ? hit._score : item[this.sort];
              items.push(item);
            }
          });
        });
        items.sort((a, b) => (order[a.id] - order[b.id]) * (this.order === 'desc' ? -1 : 1));
        this.items = items;
      }
    }
  };
</script>