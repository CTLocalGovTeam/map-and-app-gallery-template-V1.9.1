/*global define,dojo */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!./nls/template.js",
    "dojo/dom-style",
    "dojo/number",
    "config/options",
    "application/common",
    "dojo/date/locale",
    "dojo/ready",
    "dojox/form/Rating",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/keys"
], function (declare, lang, array, dom, on, query, i18n, domStyle, number, Options, Common, locale, ready, Rating, domAttr, domClass, keys) {

    return declare("application.home", [Common], {
        constructor: function () {
            ready(lang.hitch(this, function () {
                this._options = Options;
                // set default configuration options
                this.setDefaultOptions();
                this.queryOrganization().then(lang.hitch(this, function () {
                    // set app ID settings and call init after
                    this.setAppIdSettings().then(lang.hitch(this, function () {
                        // create portal
                        this.createPortal().then(lang.hitch(this, function () {
                            this.init();
                        }));
                    }));
                }));
            }));
        },
        /*------------------------------------*/
        // On sort button click
        /*------------------------------------*/
        buildSortingMenu: function () {
            var html = '', selectedClass = '', buttonClass = '', dataSortOrder = '',
                sortFields, i, node;

            // sorting fields
            sortFields = [{
                "title": i18n.viewer.sortFields.modified,
                "field": "modified",
                "defaultOrder": "desc"
            }, {
                "title": i18n.viewer.sortFields.title,
                "field": "title",
                "defaultOrder": "asc"
            }, {
                "title": i18n.viewer.sortFields.type,
                "field": "type",
                "defaultOrder": "asc"
            }, {
                "title": i18n.viewer.sortFields.numRatings,
                "field": "numRatings",
                "defaultOrder": "desc"
            }, {
                "title": i18n.viewer.sortFields.avgRating,
                "field": "avgRating",
                "defaultOrder": "desc"
            }, {
                "title": i18n.viewer.sortFields.numComments,
                "field": "numComments",
                "defaultOrder": "desc"
            }, {
                "title": i18n.viewer.sortFields.numViews,
                "field": "numViews",
                "defaultOrder": "desc"
            }];
            // html variable
            html += '<div class="grid_9 sigma">';
            html += '<ul id="sortGallery">';
            html += '<li class="label"><span>' + i18n.viewer.sortFields.sortBy + '</span></li>';
            // for each sort field
            for (i = 0; i < sortFields.length; i++) {
                // if first button
                if (i === 0) {
                    buttonClass = ' buttonLeft';
                }
                // if last button
                if (i === (sortFields.length - 1)) {
                    buttonClass = ' buttonRight';
                }
                // if default selected button
                if (sortFields[i].field === this._options.sortField) {
                    selectedClass = ' ' + sortFields[i].defaultOrder + ' active';
                    dataSortOrder = 'data-sort-order="' + this._options.sortOrder + '"';
                }
                // button html
                html += '<li class="sort' + selectedClass + '" data-default-order="' +
                    sortFields[i].defaultOrder + '" ' + dataSortOrder + ' data-sort-field="' +
                    sortFields[i].field + '"><span tabindex="0" class="silverButton' + buttonClass + '">' +
                    sortFields[i].title + '<span class="arrow">&nbsp;</span></span></li>';
            }
            html += '</ul>';
            html += '</div>';
            html += '<div class="clear"></div>';
            // html node
            node = dom.byId('groupSortOptions');
            // insert html
            this.setNodeHTML(node, html);
            // sort map gallery bar
            on(query('.sort', dom.byId("sortGallery")), "click, keyup", lang.hitch(this, function (e) {
                var sortColumn, defaultOrder, sortOrder;

                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    this.addSpinner("groupSpinner");
                    // variables for attributes
                    sortColumn = domAttr.get(e.currentTarget, "data-sort-field");
                    defaultOrder = domAttr.get(e.currentTarget, "data-default-order");
                    sortOrder = domAttr.get(e.currentTarget, "data-sort-order");
                    // sort field
                    this._options.sortField = sortColumn;
                    // sort order
                    if (sortOrder) {
                        this._options.sortOrder = this.reverseSortOrder(sortOrder);
                    } else {
                        this._options.sortOrder = defaultOrder;
                    }
                    // remove classes and data sort order
                    query("#sortGallery .sort").forEach(lang.hitch(this, function (entry) {
                        domClass.remove(entry, 'asc desc active');
                        domAttr.set(entry, 'data-sort-order', '');
                    }));
                    // set sort order
                    domAttr.set(e.currentTarget, "data-sort-order", this._options.sortOrder);
                    // set current to active
                    domClass.add(e.currentTarget, this._options.sortOrder + ' active');
                    // get maps
                    this.queryMaps();
                }
            }));
        },
        /*------------------------------------*/
        // QUERY FEATURED MAPS
        /*------------------------------------*/
        queryMaps: function (data_offset) {
            var settings = {
                // Settings
                id_group: this._options.group,
                searchType: this._options.searchType,
                sortField: this._options.sortField,
                sortOrder: this._options.sortOrder,
                pagination: this._options.showPagination,
                paginationSize: this._options.paginationSize,
                paginationShowFirstLast: true,
                paginationShowPrevNext: true,
                keywords: this._options.searchString,
                perPage: parseInt(this._options.galleryItemsPerPage, 10),
                perRow: parseInt(this._options.galleryPerRow, 10),
                layout: this._options.defaultLayout,
                searchStart: data_offset
            };
            // Call featured maps
            this.queryArcGISGroupItems(settings).then(lang.hitch(this, function (data) {
                // Build featured items
                this.buildMapPlaylist(settings, data);
            }));
        },
        /*------------------------------------*/
        // Insert Home Content
        /*------------------------------------*/
        insertHomeContent: function () {
            var node,  html = '';

            // Set home heading
            if (this._options.homeHeading) {
                node = dom.byId('homeHeading');
                this.setNodeHTML(node, this._options.homeHeading);
            }
            // Set home intro text
            if (this._options.homeSnippet) {
                node = dom.byId('homeSnippet');
                this.setNodeHTML(node, this._options.homeSnippet);
            }
            // Set home right heading
            if (this._options.homeSideHeading) {
                html += '<h2>' + this._options.homeSideHeading + '</h2>';
            }
            // Set home right content
            if (this._options.homeSideContent) {
                html += this._options.homeSideContent;
            }
            node = dom.byId('homeSideContent');
            this.setNodeHTML(node, html);
        },
        /*------------------------------------*/
        // Group auto-complete search
        /*------------------------------------*/
        groupAutoComplete: function (acQuery) {
            var settings = {
                // Settings
                id_group: this._options.group,
                searchType: this._options.searchType,
                sortField: this._options.sortField,
                // SORTING COLUMN: The allowed field names are title, modified, type, owner, avgRating, numRatings, numComments and numViews.
                sortOrder: this._options.sortOrder,
                // SORTING ORDER: Values: asc | desc
                keywords: "\"" + acQuery + "\"",
                perPage: 10,
                searchStart: 1
            };
            // Called when searching (Autocomplete)
            this.queryArcGISGroupItems(settings).then(lang.hitch(this, function (data) {
                // Show auto-complete
                this.showGroupAutoComplete(settings, data);
            }));
        },
        /*------------------------------------*/
        // Hide auto-complete
        /*------------------------------------*/
        hideGroupAutoComplete: function () {
            query("#searchListUL").forEach(lang.hitch(this, function (entry) {
                domClass.remove(entry, 'autoCompleteOpen');
            }));
            query("#groupAutoComplete").forEach(lang.hitch(this, function (entry) {
                domStyle.set(entry, 'display', 'none');
            }));
        },
        /*------------------------------------*/
        // Show auto-complete
        /*------------------------------------*/
        showGroupAutoComplete: function (obj, data) {
            var aResults = '', node, i, layerClass, regex,
                partialMatch = domAttr.get(dom.byId('searchGroup'), 'value');

            regex = new RegExp('(' + partialMatch + ')', 'gi');
            if (data.results !== null) {
                query(".searchList").forEach(lang.hitch(this, function (entry) {
                    domClass.add(entry, 'autoCompleteOpen');
                }));
                this.ACObj = data.results;
                aResults += '<ul class="zebraStripes">';
                for (i = 0; i < data.results.length; i++) {
                    layerClass = '';
                    if (i % 2 === 0) {
                        layerClass = '';
                    } else {
                        layerClass = 'stripe';
                    }
                    aResults += '<li tabindex="0" class="' + layerClass + '">' + data.results[i].title.replace(regex, '<span>' + partialMatch + '</span>') + '</li>';
                }
                aResults += '</ul>';
                node = dom.byId('groupAutoComplete');
                if (node) {
                    if (data.results.length > 0) {
                        this.setNodeHTML(node, aResults);
                    } else {
                        this.setNodeHTML(node, '<p>' + i18n.viewer.errors.noMatches + '</p>');
                        clearTimeout(this.ACTimeout);
                        this.ACTimeout = setTimeout(lang.hitch(this, function () {
                            this.hideGroupAutoComplete();
                        }), 3000);
                    }
                    domStyle.set(node, 'display', 'block');
                }
                // Autocomplete key up and click
                on(query('li', dom.byId("groupAutoComplete")), "click, keyup", lang.hitch(this, function (e) {
                    var all, mapURL, externalLink = false, locNum;

                    all = query('#groupAutoComplete li');
                    // get result number
                    locNum = array.indexOf(all, e.currentTarget);
                    if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                        // hide auto complete
                        this.hideGroupAutoComplete();
                        // if map has a url
                        externalLink = false;
                        if (this.ACObj[locNum].type === "Web Map") {
                            mapURL = this.getViewerURL(this._options.mapViewer, this.ACObj[locNum].id);
                        } else if (this.ACObj[locNum].type === "CityEngine Web Scene") {
                            mapURL = this.getViewerURL('cityengine', this.ACObj[locNum].id);
                            externalLink = true;
                        } else if (this.ACObj[locNum].url) {
                            mapURL = this.ACObj[locNum].url;
                            externalLink = true;
                        } else {
                            mapURL = this.getViewerURL('item_data', this.ACObj[locNum].id);
                            externalLink = true;
                        }
                        if (externalLink) {
                            window.open(mapURL);
                        } else {
                            // load map
                            window.location = mapURL;
                        }
                    } else if (e.keyCode === keys.DOWN_ARROW) {
                        if (all[locNum + 1]) {
                            all[locNum + 1].focus();
                        } else {
                            all[0].focus();
                        }
                    } else if (e.keyCode === keys.UP_ARROW) {
                        if (all[locNum - 1]) {
                            all[locNum - 1].focus();
                        } else {
                            all[all.length - 1].focus();
                        }
                    }
                }));
            }
        },
        /*------------------------------------*/
        // Build Map Playlist
        /*------------------------------------*/
        buildMapPlaylist: function (obj, data) {
            var node, html, totalItems, totalResults, layout, forTotal, itemTitle, thumb,
                itemURL, snippet, linkTarget, externalLink, widget, rating, pluralRatings,
                pluralComments, pluralViews, endRow, itemClass, modifiedDate,
                modifiedLocalized, i;

            // hide auto complete
            this.hideGroupAutoComplete();
            // Remove Spinner
            this.removeSpinner();
            // Clear Pagination
            node = dom.byId('maps_pagination');
            this.setNodeHTML(node, '');
            // HTML Variable
            html = '';
            // Get total results
            totalItems = data.total;
            totalResults = data.results.length;
            // If we have items
            if (totalItems > 0) {
                layout = 'mapsGrid';
                if (obj.layout === 'list') {
                    layout = 'mapsList';
                }
                // If perpage is more than total
                if (obj.pagination && obj.perPage && obj.perPage < totalResults) {
                    // Use per page
                    forTotal = obj.perPage;
                } else {
                    // Use total
                    forTotal = totalResults;
                }
                // Create list items
                for (i = 0; i < forTotal; i++) {
                    externalLink = false;
                    if (this._options.openGalleryItemsNewWindow) {
                        externalLink = true;
                    }
                    if (data.results[i].type === "Web Map") {
                        // url variable
                        itemURL = this.getViewerURL(this._options.mapViewer, data.results[i].id);
                    } else if (data.results[i].type === "CityEngine Web Scene") {
                        itemURL = this.getViewerURL('cityengine', data.results[i].id);
                        externalLink = true;
                    } else if (data.results[i].url) {
                        itemURL = data.results[i].url;
                        externalLink = true;
                    } else {
                        itemURL = this.getViewerURL('item_data', data.results[i].id);
                        externalLink = true;
                    }
                    if (obj.layout === 'list') {
                        itemTitle = data.results[i].title;
                        snippet = '';
                        if (data.results[i].snippet) {
                            snippet = data.results[i].snippet;
                        }
                        linkTarget = '';
                        if (externalLink) {
                            linkTarget = 'target="_blank"';
                        }
                        // Build list item
                        html += '<div class="grid_9 sigma">';
                        html += '<div class="item">';
                        html += '<a ' + linkTarget + ' class="block" id="mapItem' + i + '" title="' + itemTitle + '" href="' + itemURL + '">';
                        thumb = data.results[i].thumbnailUrl;
                        if (!thumb) {
                            thumb = 'images/defaultThumb.png';
                        }
                        html += '<img alt="' + itemTitle + '" src="' + thumb + '" width="200" height="133" />';
                        html += '</a>';
                        html += '<div class="itemInfo">';
                        html += '<strong><a ' + linkTarget + ' class="title" id="mapItemLink' + i + '" title="' + snippet + '" href="' + itemURL + '">' + itemTitle + '</a></strong>';
                        // modified date
                        if (data.results[i].modified) {
                            // date object
                            modifiedDate = new Date(data.results[i].modified);
                            // date format for locale
                            modifiedLocalized = locale.format(modifiedDate, {
                                selector: "date",
                                datePattern: i18n.viewer.main.datePattern
                            });
                        }
                        // html
                        html += '<p class="dateInfo">';
                        html += data.results[i].type + ' ';
                        html += i18n.viewer.itemInfo.by + ' ';
                        if (this._options.showProfileUrl) {
                            html += '<a href="' + this.getViewerURL('owner_page', false, data.results[i].owner) + '">';
                        }
                        html += data.results[i].owner;
                        if (this._options.showProfileUrl) {
                            html += '</a>';
                        }
                        html += '. ';
                        if (modifiedLocalized) {
                            html += 'Last modified ' + modifiedLocalized + '. ';
                        }
                        html += '</p>';
                        html += '<p>' + snippet + '</p>';
                        if (this._options.showRatings) {
                            // rating widget
                            widget = new Rating({
                                numStars: 5,
                                value: data.results[i].avgRating
                            }, null);
                        }
                        // rating container
                        html += '<div class="ratingCon">';
                        if (this._options.showRatings) {
                            html += widget.domNode.outerHTML;
                        }
                        rating = '';
                        if (this._options.showRatings) {
                            // Ratings
                            if (data.results[i].numRatings) {
                                pluralRatings = i18n.viewer.itemInfo.ratingsLabel;
                                if (data.results[i].numRatings > 1) {
                                    pluralRatings = i18n.viewer.itemInfo.ratingsLabelPlural;
                                }
                                rating += number.format(data.results[i].numRatings) + ' ' + pluralRatings;
                            }
                        }
                        if (this._options.showComments) {
                            // comments
                            if (data.results[i].numComments) {
                                if (data.results[i].numRatings) {
                                    rating += i18n.viewer.itemInfo.separator + ' ';
                                }
                                pluralComments = i18n.viewer.itemInfo.commentsLabel;
                                if (data.results[i].numComments > 1) {
                                    pluralComments = i18n.viewer.itemInfo.commentsLabelPlural;
                                }
                                rating += number.format(data.results[i].numComments) + ' ' + pluralComments;
                            }
                        }
                        // views
                        if (this._options.showViews && data.results[i].numViews) {
                            if ((data.results[i].numRatings && this._options.showRatings) || (data.results[i].numComments && this._options.showComments)) {
                                rating += i18n.viewer.itemInfo.separator + ' ';
                            }
                            pluralViews = i18n.viewer.itemInfo.viewsLabel;
                            if (data.results[i].numViews > 1) {
                                pluralViews = i18n.viewer.itemInfo.viewsLabelPlural;
                            }
                            rating += number.format(data.results[i].numViews) + ' ' + pluralViews;
                        }
                        if (rating) {
                            html += ' (' + rating + ')';
                        }
                        if (externalLink) {
                            html += '<span class="iconCon"><span class="icon external"></span>';
                        }
                        html += '</div>';
                        html += '</div>';
                        html += '<div class="clear"></div>';
                        html += '</div>';
                        html += '</div>';
                        html += '<div class="clear"></div>';
                    } else {
                        endRow = false;
                        itemClass = '';
                        itemTitle = data.results[i].title;
                        snippet = '';
                        if (data.results[i].snippet) {
                            snippet = data.results[i].snippet;
                        }
                        linkTarget = '';
                        if (externalLink) {
                            linkTarget = 'target="_blank"';
                        }
                        // Last row item
                        if ((i + 1) % obj.perRow === 0) {
                            itemClass = ' omega';
                            endRow = true;
                        }
                        // First row item
                        if ((i + 3) % obj.perRow === 0) {
                            itemClass = ' alpha';
                        }
                        // Build grid item
                        html += '<div class="grid_3' + itemClass + '">';
                        html += '<a class="item" ' + linkTarget + ' id="mapItem' + i + '" href="' + itemURL + '">';
                        html += '<span class="summaryHidden"><strong>' + itemTitle + '</strong>' + this.truncate(snippet, 120) + '</span>';
                        thumb = data.results[i].thumbnailUrl;
                        if (!thumb) {
                            thumb = 'images/defaultThumb.png';
                        }
                        html += '<img alt="' + itemTitle + '" class="gridImg" src="' + thumb + '" width="200" height="133" />';
                        html += '<span class="itemCounts">';
                        if (externalLink) {
                            html += '<span class="iconCon"><span class="icon external"></span>';
                        }
                        if (this._options.showViews) {
                            html += '<span class="iconCon"><span class="icon views"></span><span class="iconText">' + number.format(data.results[i].numViews) + '</span></span>';
                        }
                        if (this._options.showComments) {
                            html += '<span class="iconCon"><span class="icon comments"></span><span class="iconText">' + number.format(data.results[i].numComments) + '</span></span>';
                        }
                        if (this._options.showRatings) {
                            html += '<span class="iconCon"><span class="icon ratings"></span><span class="iconText">' + number.format(data.results[i].numRatings) + '</span></span>';
                        }
                        html += '</span>';
                        html += '</a>';
                        html += '</div>';
                        if (endRow) {
                            html += '<div class="clear"></div>';
                        }
                    }
                }
                // Close
                html += '<div class="clear"></div>';
            } else {
                // No results
                html += '<div class="grid_5 suffix_4 sigma"><p class="alert error">' + i18n.viewer.errors.noMapsFound + ' <a tabindex="0" id="resetGroupSearch">' + i18n.viewer.groupPage.showAllMaps + '</a></p></div>';
                html += '<div class="clear"></div>';
            }
            // Insert HTML
            node = dom.byId('featuredMaps');
            if (node) {
                domClass.remove(node, 'mapsGrid mapsList');
                domClass.add(node, layout);
                this.setNodeHTML(node, html);
            }
            // Create pagination
            this.createPagination(obj, totalItems, 'maps_pagination');
            // Featured maps pagination onclick function
            on(query('.enabled', dom.byId("maps_pagination")), "click, keyup", lang.hitch(this, function (e) {
                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    // clicked
                    domClass.add(e.currentTarget, 'clicked');
                    // add loading spinner
                    this.addSpinner("paginationSpinner");
                    // get offset number
                    var data_offset = domAttr.get(e.currentTarget, 'data-offset');
                    this.dataOffset = data_offset;
                    // query maps function
                    this.queryMaps(data_offset);
                }
            }));
            if (dom.byId("resetGroupSearch")) {
                // search reset button
                on(dom.byId("resetGroupSearch"), "click, keyup", lang.hitch(this, function (e) {
                    if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                        domClass.remove(dom.byId('clearAddress'), 'resetActive');
                        domAttr.set(dom.byId('searchGroup'), 'value', '');
                        var textVal = '';
                        this._options.searchString = textVal;
                        this.addSpinner("groupSpinner");
                        this.queryMaps();
                        this.prevVal = textVal;
                        this.hideGroupAutoComplete();
                    }
                }));
            }
        },
        /*------------------------------------*/
        // Enalbe layout and search options
        /*------------------------------------*/
        configLayoutSearch: function () {
            var html = '', listClass, gridClass, node;

            // if show search or show layout switch
            if (this._options.showGroupSearch || this._options.showLayoutSwitch) {
                // if show search
                html += '<div id="searchListCon" class="grid_5 alpha">';
                if (this._options.showGroupSearch) {
                    html += '<ul id="searchListUL" class="searchList">';
                    html += '<li id="mapSearch" class="iconInput">';
                    html += '<input placeholder="' + i18n.viewer.groupPage.searchPlaceholder + '" id="searchGroup" title="' + i18n.viewer.groupPage.searchTitle + '" value="' + this._options.searchString + '" autocomplete="off" type="text" tabindex="0" />';
                    html += '<div tabindex="0" title="' + i18n.viewer.main.clearSearch + '" class="iconReset" id="clearAddress"></div>';
                    html += '</li>';
                    html += '<li title="' + i18n.viewer.groupPage.searchTitleShort + '" class="searchButtonLi">';
                    html += '<span tabindex="0" id="searchGroupButton" class="silverButton buttonRight">';
                    html += '<span class="searchButton">&nbsp;</span></span>';
                    html += '</li>';
                    html += '<li id="groupSpinner" class="spinnerCon"></li>';
                    html += '</ul>';
                    html += '<div class="clear"></div>';
                    html += '<div id="acCon"><div id="groupAutoComplete" class="autoComplete"></div></div><div class="clear"></div>';
                } else {
                    html += '&nbsp;';
                }
                html += '</div>';
                // if show switch
                html += '<div class="grid_4 omega">';
                if (this._options.showLayoutSwitch) {
                    if (this._options.defaultLayout === "list") {
                        listClass = 'active';
                        gridClass = '';
                    } else {
                        listClass = '';
                        gridClass = 'active';
                    }
                    html += '<div class="toggleLayout">';
                    html += '<ul>';
                    html += '<li id="layoutList" class="' + listClass + '" title="' + i18n.viewer.groupPage.listSwitch + '">';
                    html += '<span tabindex="0" class="silverButton buttonRight"><span class="listView">&nbsp;</span></span>';
                    html += '<li id="layoutGrid" class="' + gridClass + '" title="' + i18n.viewer.groupPage.gridSwitch + '">';
                    html += '<span tabindex="0" class="silverButton buttonLeft"><span class="gridView">&nbsp;</span></span>';
                    html += '</li>';
                    html += '<li id="layoutSpinner" class="spinnerCon"></li>';
                    html += '</li>';
                    html += '</ul>';
                    html += '<div class="clear"></div>';
                    html += '</div>';
                    html += '<div class="clear"></div>';
                } else {
                    html += '&nbsp;';
                }
                html += '</div>';
                html += '<div class="clear"></div>';
                // if node, insert HTML
                node = dom.byId('layoutAndSearch');
                this.setNodeHTML(node, html);
                this.checkAddressStatus(dom.byId("searchGroup"), dom.byId('clearAddress'));
            }
        },
        /*------------------------------------*/
        // Event Delegations
        /*------------------------------------*/
        setDelegations: function () {
            // search button
            on(dom.byId("searchGroupButton"), "click, keyup", lang.hitch(this, function (e) {
                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    var textVal = domAttr.get(dom.byId('searchGroup'), 'value');
                    if (textVal !== this.prevVal) {
                        this._options.searchString = textVal;
                        this.addSpinner("groupSpinner");
                        this.queryMaps();
                        this.prevVal = textVal;
                    }
                }
            }));
            // list view
            on(dom.byId("layoutList"), "click, keyup", lang.hitch(this, function (e) {
                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    if (this._options.defaultLayout !== 'list') {
                        this._options.defaultLayout = 'list';
                        query('.toggleLayout li').forEach(lang.hitch(this, function (entry) {
                            domClass.remove(entry, 'active');
                        }));
                        domClass.add(e.currentTarget, 'active');
                        this.addSpinner("layoutSpinner");
                        this.queryMaps(this.dataOffset);
                    }
                }
            }));
            // grid view
            on(dom.byId("layoutGrid"), "click, keyup", lang.hitch(this, function (e) {
                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    if (this._options.defaultLayout !== 'grid') {
                        this._options.defaultLayout = 'grid';
                        query('.toggleLayout li').forEach(lang.hitch(this, function (entry) {
                            domClass.remove(entry, 'active');
                        }));
                        domClass.add(e.currentTarget, 'active');
                        this.addSpinner("layoutSpinner");
                        this.queryMaps(this.dataOffset);
                    }
                }
            }));
            // Reset X click
            on(query('.iconReset', dom.byId("mainPanel")), "click, keyup", lang.hitch(this, function (e) {
                var obj, textVal = '';

                if (e.type === 'click' || (e.keyCode === keys.ENTER)) {
                    obj = dom.byId('searchGroup');
                    this.clearAddress(obj, e.currentTarget);
                    this._options.searchString = textVal;
                    this.addSpinner("groupSpinner");
                    this.queryMaps();
                    this.prevVal = textVal;
                    this.hideGroupAutoComplete();
                }
            }));
            // auto complete && address specific action listeners
            on(dom.byId("searchGroup"), "keyup", lang.hitch(this, function (e) {
                var aquery, all, locNum, alength, textVal;

                this.checkAddressStatus(e.currentTarget, dom.byId('clearAddress'));
                aquery = domAttr.get(e.currentTarget, 'value');
                all = query('#groupAutoComplete li');
                locNum = array.indexOf(all, e.currentTarget);
                alength = aquery.length;
                if (e.keyCode === keys.ENTER) {
                    clearTimeout(this.timer);
                    textVal = domAttr.get(e.currentTarget, 'value');
                    if (textVal !== this.prevVal) {
                        this._options.searchString = textVal;
                        this.addSpinner("groupSpinner");
                        this.queryMaps();
                        this.prevVal = textVal;
                    }
                    this.hideGroupAutoComplete();
                } else if (e.keyCode === keys.UP_ARROW) {
                    if (all[locNum - 1]) {
                        all[locNum - 1].focus();
                    } else {
                        all[all.length - 1].focus();
                    }
                } else if (e.keyCode === keys.DOWN_ARROW) {
                    if (all[locNum + 1]) {
                        all[locNum + 1].focus();
                    } else {
                        all[0].focus();
                    }
                } else if (alength >= 2) {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(lang.hitch(this, function () {
                        this.groupAutoComplete(aquery);
                    }), 250);
                } else {
                    this.hideGroupAutoComplete();
                }
            }));
        },
        /*------------------------------------*/
        // Init
        /*------------------------------------*/
        init: function () {
            // set default data offset
            if (!this.dataOffset) {
                this.dataOffset = 0;
            }
            // set loading text
            var node = dom.byId('featuredLoading');
            this.setNodeHTML(node, i18n.viewer.groupPage.loadingText);
            // Query group and then query maps
            this.queryGroup().then(lang.hitch(this, function () {
                // insert home items
                this.insertHomeContent();
                // Configure grid/list and search
                this.configLayoutSearch();
                if (this._options.showGroupSort) {
                    // build sorting menu
                    this.buildSortingMenu();
                }
                // query for maps
                this.queryMaps();
                // set up event delegations
                this.setDelegations();
            }));
        }
    });
});
