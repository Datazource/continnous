<template>
  <div :class="['scroll-container', 'resources-list-container', 'resources-list-' + (masonry ? 'masonry' : 'stream'), 'resources-list-' + rows + '-rows']">
    <md-toolbar class="md-dense">
      <h2 class="md-title">{{title}}</h2>
    </md-toolbar>
    <md-toolbar class="md-dense md-nav-bar">
      <slot name="buttons"></slot>
      <div style="flex: 1"></div>
      <md-menu md-direction="bottom left" md-size="4">
        <md-button md-menu-trigger>
          <template v-for="field in sortFields" v-if="field.current">
            <md-icon>arrow_{{reverseOrderQuery.order !== 'desc' ? 'down' : 'up'}}ward</md-icon>
            {{$t('fields.' + field.name)}}
          </template>
        </md-button>
        <md-menu-content>
          <md-subheader>{{$t('sort.sort')}}</md-subheader>
          <md-menu-item
              v-for="field in sortFields"
              @selected="$router.replace({query: field.query})"
              :disabled="field.current"
          >{{$t('fields.' + field.name)}}</md-menu-item>
          <md-divider></md-divider>
          <md-subheader>{{$t('sort.order')}}</md-subheader>
          <md-menu-item
              v-for="order in ['asc', 'desc']"
              @selected="$router.replace({query: reverseOrderQuery})"
              :disabled="reverseOrderQuery.order !== order"
          >
            <span>{{$t('sort.' + order)}}</span>
            <md-icon>arrow_{{order === 'desc' ? 'down' : 'up'}}ward</md-icon>
          </md-menu-item>
        </md-menu-content>
      </md-menu>
      <md-button class="md-icon-button" @click="masonry = !masonry">
        <md-icon>{{'view_' + (masonry ? 'stream' : 'quilt')}}</md-icon>
      </md-button>
      <md-button v-if="trashEnabled" @click="$router.push('/' + organization.key + '/' + type + (personal ? '/personal' : '') + (trash ? '' : '/trash'))" :class="{'md-contrast': trash}">
        <md-icon>delete</md-icon>
        <span>{{$t('trash')}}</span>
      </md-button>
    </md-toolbar>

    <div class="scroll-container-hgroup">
      <div class="scroll-content">
        <div v-if="preview.item" class="resources-list-edit-item">
          <div class="resources-list-item">
            <resource-item
                :item="preview.item"
                :trash="false"
                :personal="personal"
                :permissions="permissions"
                :type="type"
                :organization="organization"
                normalize
            ></resource-item>
          </div>
        </div>
        <div ref="list" :class="['resources-list']">
          <div :class="['resources-list-item', 'item-' + item.id]" v-for="item in items" v-if="!preview.item || preview.id !== item.id">
            <resource-item
                :item="item"
                :trash="trash"
                :personal="item.hasOwnProperty('personal') ? item.personal : personal"
                :permissions="permissions"
                :type="item.resource || type"
                :organization="organization"
            ></resource-item>
          </div>
        </div>
      </div>

      <slot></slot>
    </div>
  </div>
</template>

<script>
  import Masonry from 'masonry-layout';
  import ResourceItem from './Item';
  import Bus from '../../../bus';

  export default {
    components: { ResourceItem },
    props: {
      items: [Array, Object],
      title: String,
      organization: Object,
      type: String,
      permissions: Object,
      trash: Boolean,
      trashEnabled: Boolean,
      personal: Boolean,
      sort: String,
      order: String,
      additionalSort: [String, Array],
      masonryItemMinWidth: {
        type: Number,
        default: 300
      }
    },
    data() {
      return {
        mounted: false,
        masonry: true,
        rows: 1,
        preview: {
          id: undefined,
          item: undefined,
          action: undefined
        }
      };
    },
    computed: {
      reverseOrderQuery() {
        const query = Object.assign({}, this.$route.query);
        const current = this.order || this.$route.query.order || 'desc';
        query.order = current === 'desc' ? 'asc' : 'desc';
        return query;
      },
      sortFields() {
        let fields = ['updated', 'created'];
        const addFields = this.additionalSort;
        if (addFields) {
          fields = (typeof addFields === 'string' ? addFields.split(',') : addFields)
            .concat(fields);
        }
        const current = this.sort || this.$route.query.sort || fields[0];
        fields.forEach((name, i) => {
          const query = Object.assign({}, this.$route.query);
          query.sort = name;
          fields[i] = { query, name, current: name === current };
        });
        return fields;
      }
    },
    created() {
      const listener = (action, id, item) => {
        const preview = this.preview;
        const reloadItems = (preview.action === 'edit' || action === 'edit')
          && (!preview.item || preview.id !== id);
        preview.action = action;
        preview.id = id;
        preview.item = item;
        if (reloadItems) {
          this.$nextTick(() => {
            if (this.msnry) {
              this.msnry.reloadItems();
              this.msnry.layout();
            }
          });
        }
      };
      Bus.$on('edit-resource', listener.bind(this, 'edit'));
      Bus.$on('create-resource', listener.bind(this, 'create'));
    },
    mounted() {
      this.mounted = true;
      /* global window */
      window.addEventListener('resize', this.updateRows);
      this.updateRows();
      this.$nextTick(() => {
        this.updateMasonry();
      });
    },
    beforeDestroy() {
      this.mounted = false;
      /* global window */
      window.removeEventListener('resize', this.updateRows);
      this.updateMasonry();
    },
    watch: {
      masonry() {
        this.$nextTick(this.updateMasonry);
      },
      $route() {
        this.$nextTick(() => {
          this.updateRows();
        });
      },
      rows() {
        this.$nextTick(() => {
          if (this.msnry) {
            this.msnry.layout();
          }
        });
      },
      items: {
        deep: true,
        handler() {
          this.$nextTick(() => {
            if (this.msnry) {
              this.msnry.reloadItems();
              this.msnry.layout();
            }
          });
        }
      }
    },
    methods: {
      updateMasonry() {
        if ((!this.masonry || !this.mounted) && this.msnry) {
          this.msnry.destroy();
          delete this.msnry;
        } else if (this.masonry && !this.msnry && this.mounted) {
          this.msnry = new Masonry(this.$refs.list, {
            percentPosition: true,
          });
          this.msnry.layout();
        }
      },
      updateRows() {
        const list = this.$refs.list;
        const rect = list.getBoundingClientRect();
        this.rows = Math.max(0, Math.floor(rect.width / this.masonryItemMinWidth));
      }
    }
  };
</script>


<style lang="scss" rel="stylesheet/scss">
  .resources-list-stream {
    .resources-list-item {
      margin: 32px auto 0;
      width: 100%;
      max-width: 500px;
      &:first-child {
        margin-top: 16px;
      }
    }
  }
  .resources-list-masonry {
    margin: 0 -8px;
    .resources-list-item {
      display: block;
      > .md-card {
        margin: 0 8px 16px;
      }
    }
    .resources-list-edit-item {
      .resources-list-item {
        margin: 0 auto;
      }
      &:after {
        content: "";
        display: block;
        height: 1px;
        background: rgba(#000, 0.15);
        margin: 0 8px 16px;
      }
    }
    .resources-list-item {
      width: 100%;
    }
    &.resources-list-2-rows .resources-list-item {
      width: 50%;
    }
    &.resources-list-3-rows .resources-list-item {
      width: 33.3333%;
    }
    &.resources-list-4-rows .resources-list-item {
      width: 25%;
    }
    &.resources-list-5-rows .resources-list-item {
      width: 20%;
    }
  }
</style>