import { pageTitle } from 'ember-page-title';
import Checkout from '../components/checkout';

<template>
  {{pageTitle "mother-mask · Ember.js example"}}

  <Checkout />

  {{outlet}}
</template>
