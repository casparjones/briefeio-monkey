// ==UserScript==
// @name        briefe.io
// @namespace   Violentmonkey Scripts
// @match       https://www.briefe.io/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @version     1.4
// @author      frank@lovely-apps.com
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// @require     https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/core.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/md5.js
// @updateURL   https://github.com/casparjones/briefeio-monkey/raw/main/briefe.io.user.js
// @description briefe.io script for adding contacts and sync to a couchDB instance
// ==/UserScript==

function getBriefIo() {
  var brief = {};
  brief.revisons = {};
  brief.type = 'sender';

  brief.addButtons = function() {
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="save">save</a><li>');
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="delete">delete</a><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="save_recipient">save</a><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="delete_recipient">delete</a><li>');
  }

  brief.addList = function() {
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><span style="margin-right: 5px; padding: 5px;" id="contact_list"></span><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><span style="margin-right: 5px; padding: 5px;" id="contact_list_receiver"></span><li>');
  }

  brief.addEvents = function() {
    $('#save').click(() => { brief.type="sender"; brief.saveContact();});
    $('#delete').click(() => { brief.type="sender"; brief.deleteContact();});
    $('#save_recipient').click(() => { brief.type="recipient"; brief.saveContact();});
    $('#delete_recipient').click(() => { brief.type="recipient"; brief.deleteContact();});
  }

  brief.newContact = function(data) {
    if(typeof data == "undefined") data = {};
    let contact = { data: {}, elements: {} };
    contact.elements = {
      'name': 'input[name="letter[' + brief.type + '][name]"]',
      'street': 'input[name="letter[' + brief.type + '][street]"]',
      'postalCode': 'input[name="letter[' + brief.type + '][postalCode]"]',
      'city': 'input[name="letter[' + brief.type + '][city]"]',
      'country': 'input[name="letter[' + brief.type + '][country]"]',
      'contact.mobile': 'input[name="letter[' + brief.type + '][contact][mobile]"]',
      'contact.email': 'input[name="letter[' + brief.type + '][contact][email]"]',
      'financial.institute': 'input[name="letter[' + brief.type + '][financial][institute]"]',
      'financial.iban': 'input[name="letter[' + brief.type + '][financial][iban]"]',
      'financial.bic': 'input[name="letter[' + brief.type + '][financial][bic]"]',
      'references.customerNumber': 'input[name="letter[' + brief.type + '][references][customerNumber]'
    };

    contact.parseHtml = function() {
      var contact = this;
      Object.keys(contact.elements).forEach(function(name) {
        let key = contact.elements[name];
        if($(key).length > 0) {
          if($(key).attr('type') == "text") {
            contact.data[name] = $(key).val();
          } else {
            contact.data[name] = $(key).val();
          }
        }
      });
      contact.data._id = CryptoJS.MD5(contact.getContact()).toString();
      if(typeof brief.revisons[contact.data._id] !== "undefined") {
        contact.data._rev = brief.revisons[contact.data._id];
      }
    }

    contact.updateHtml = function() {
      var contact = this;
      Object.keys(contact.elements).forEach(function(name) {
        let key = contact.elements[name];
        if($(key).length > 0) {
          if($(key).attr('type') == "text") {
            $(key).val(contact.data[name]);
          } else {
            $(key).val(contact.data[name]);
          }
        }
      });
    }

    contact.remove = function() {
      let rev = brief.revisons[this.data._id];
      brief.db.remove(this.data._id, rev).then((result) => {
        delete brief.revisons[this.data._id];
      });

    }

    contact.getContact = function() {
      return this.data.name;
    }

    contact.getName = function() {
      return this.data.name;
    }

    contact.data = data;
    return contact;
  }

  brief.saveContact = function() {
    var contact = brief.newContact()
    contact.parseHtml();
    brief.db.put(contact.data, function callback(err, result) {
      if (!err) {
        brief.revisons[result.id] = result.rev;
        console.log('Successfully saved a contact!');
        brief.updateList().then(() => {
          brief.selectListId(contact.data._id);
        });
      } else {
        console.error(err);
      }
    });
  }

  brief.loadContacts = function() {
    var def = jQuery.Deferred();
    brief.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      if(err) {
        def.reject(err);
      } else {
        let contacts = [];
        doc.rows.forEach(function(row) {
          brief.revisons[row.doc._id] = row.doc._rev;
          contacts.push(brief.newContact(row.doc));
        });
        def.resolve(contacts);
      }
    });

    return def;
  }

  brief.getContact = function(id) {
    var def = jQuery.Deferred();
    brief.db.get(id).then(function(doc) {
      def.resolve(brief.newContact(doc));
    })

    return def;
  }

  brief.changeContact = function(option) {
    brief.type = "sender";
    let id = $(option.target).val();
    brief.getContact(id).done(function(contact) {
      contact.updateHtml();
    })
  }


  brief.changeContactReceiver = function(option) {
    brief.type = "recipient";
    let id = $(option.target).val();
    brief.getContact(id).done(function(contact) {
      contact.updateHtml();
    })
  }

  brief.updateList = function() {
    var def = jQuery.Deferred();
    brief.loadContacts().done(function(contacts) {
      var select = $('<select id="contact_selection" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var select_receiver = $('<select id="contact_selection_receiver" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var option1 = $('<option value="0">choose Contact</option>');
      var option2 = $('<option value="0">choose Contact</option>');
      select.append(option1);
      select_receiver.append(option2);

      contacts.forEach(function(contact) {
        option1 = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');
        option2 = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');
        select.append(option1);
        select_receiver.append(option2);
      })

      $('#contact_list').html(select);
      $('#contact_list select').on('change', brief.changeContact);

      $('#contact_list_receiver').html(select_receiver);
      $('#contact_list_receiver select').on('change', brief.changeContactReceiver);
      def.resolve();
    });
    return def;
  }

  brief.selectListId = function(id) {
    $('#contact_list select').val(id);
    $('#contact_list_receiver select').val(id);
  }

  brief.deleteContact = function(option) {
    let id = $('#contact_selection').val();
    brief.getContact(id).done(function(contact) {
      contact.remove();
      brief.updateList();
    })
  }

  brief.delete = function() {
    let id = $(option.target).val();
  }

  brief.config = function() {
    GM_registerMenuCommand("set couchDB remote URL", () => {
      let remoteUrl = prompt("Please enter your couchDB URL here!")
      GM_setValue('remoteUrl', remoteUrl);
    });

    brief.remoteUrl = GM_getValue("remoteUrl")
  }

  // brief.helper = getHelper();
  brief.init = function() {
    brief.db = new PouchDB('briefIo');
    if(brief.remoteUrl) {
      PouchDB.sync('briefIo', brief.remoteUrl);
    }
    brief.addButtons();
    brief.addList();
    brief.updateList();
    brief.addEvents();
  }
  return brief;
}

(function() {
  'use strict';
  var brief = getBriefIo();
  brief.config();
  brief.init();
})();
