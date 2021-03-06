<template>
  <div>
    <p class="md-caption">{{$tc('domain', 2)}}</p>
    <card-form
        ref="form"
        :firebase-path="'/security/organizations/' + organization.key + '/domains'"
        :firebase-bind="true"
        :validate="{member: isDomainArrayValid, guest: isDomainArrayValid}"
        :keys="['member', 'guest']"
    >
      <template scope="form">
        <div class="permission-domains" v-for="(title, key) in {member: $t('organization.domains'), guest: $t('guest.domains')}">
          <div class="permission-domains-label">{{title}}</div>
          <div class="permission-domains-container">
            <div class="permission-domains-entry" v-for="(domain, index) in (form.values[key] || [])">
              <md-input-container md-inline>
                <label>{{$tc('domain', 1)}}</label>
                <md-input required :value="domain" @input="onDomainChange(key, index, $event)"></md-input>
              </md-input-container>
              <md-button class="md-icon-button" @click="removeDomain(key, index)">
                <md-icon>clear</md-icon>
              </md-button>
            </div>
            <md-button class="md-link" v-if="(!form.values[key] || form.values[key].length < 5) && !form.errors[key]" @click="addDomain(key)">{{$t('addDomain')}}</md-button>
          </div>
        </div>
      </template>
    </card-form>
  </div>
</template>

<script>
  import CardForm from '../../../form/Card';

  export default {
    props: ['organization'],
    components: { CardForm },
    methods: {
      isDomainArrayValid(domainArray) {
        let valid = true;
        (domainArray || []).forEach((domain) => {
          valid = valid && this.isDomainValid(domain);
        });
        return valid;
      },
      isDomainValid(domain) {
        return typeof domain === 'string' && domain.match(/^(?!-)(?:[a-zA-Z\d-]{0,62}[a-zA-Z\d]\.){1,126}(?!\d+)[a-zA-Z\d]{1,63}$/);
      },
      onDomainChange(type, index, domain) {
        const form = this.$refs.form;
        const newDomains = form.values[type].slice(0);
        newDomains[index] = domain;
        form.onChange(type, newDomains);
      },
      addDomain(type) {
        const form = this.$refs.form;
        const newDomains = (form.values[type] || []).slice(0).concat('');
        form.$set(form.values, type, newDomains);
        form.$set(form.errors, type, true);
      },
      removeDomain(type, index) {
        const form = this.$refs.form;
        const newDomains = (form.values[type] || []).slice(0);
        newDomains.splice(index, 1);
        form.$set(form.values, type, newDomains);
        form.onChange(type, form.values.hasOwnProperty(type) ? newDomains : '');
      }
    }
  };
</script>

<style lang="scss" rel="stylesheet/scss">
  .permission-domains {
    margin-top:6px;
    & + & {
      margin-top: 24px;
    }
    position: relative;
    display: flex;
    flex-flow: row wrap;
    .permission-domains-label {
      min-width: 164px;
    }
    .permission-domains-container {
      flex: 1;
      .permission-domains-entry {
        width: 100%;
        display: flex;
        flex-flow: row wrap;
        &:last-of-type {
          margin-bottom: -22px;
        }
        .md-input-container {
          flex: 1;
          margin-top: 0;
          margin-bottom: 0;
          position: relative;
          top: -22px;
        }
        .md-icon-button {
          top: -8px;
        }
      }
      > .md-button {
        margin-top: 16px;
        &:first-child {
          margin-top: 0;
        }
      }
    }
  }
</style>