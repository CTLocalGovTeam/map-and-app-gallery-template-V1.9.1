﻿/*global define,dojo,alert,CollectUniqueTags,TagCloudObj,ItemGallery */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
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
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom",
    "dojo/_base/lang",
    "dojo/text!./templates/leftPanel.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!nls/localizedStrings",
    "dojo/topic",
    "dojo/Deferred",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/_base/array",
    "dojo/NodeList-manipulate",
    "widgets/gallery/gallery"
], function (declare, domConstruct, domAttr, dom, lang, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, nls, topic, Deferred, query, domClass, domStyle, domGeom, array) {

    declare("CollectUniqueTags", null, {

        setNodeValue: function (node, text) {
            if (text) {
                domAttr.set(node, "innerHTML", text);
            }
        },

        /**
        * Collect all the tags in an array
        * @memberOf widgets/leftPanel/leftPanel
        */
        collectTags: function (results, prefixTag) {
            var i, j, tagsObj, groupItemsTagsdata = [];

            for (i = 0; i < results.length; i++) {
                for (j = 0; j < results[i].tags.length; j++) {
                    if (!groupItemsTagsdata[results[i].tags[j]]) {
                        groupItemsTagsdata[results[i].tags[j]] = 1;
                    } else {
                        groupItemsTagsdata[results[i].tags[j]]++;
                    }
                }
            }
            groupItemsTagsdata = this._sortArray(groupItemsTagsdata);
            if (groupItemsTagsdata.length === 0) {
                groupItemsTagsdata = null;
            }
            tagsObj = {
                "groupItemsTagsdata": groupItemsTagsdata
            };
            return tagsObj;
        },

        /**
        * Sort the the tag cloud array in order
        * @memberOf widgets/leftPanel/leftPanel
        */
        _sortArray: function (tagArray) {
            var i, sortedArray = [];

            for (i in tagArray) {
                if (tagArray.hasOwnProperty(i)) {
                    sortedArray.push({
                        key: i,
                        value: tagArray[i]
                    });
                }
            }
            sortedArray.sort(function (a, b) {
                if (a.value > b.value) {
                    return -1;
                }
                if (a.value < b.value) {
                    return 1;
                }
                return 0;
            });
            return sortedArray;
        },

        /**
        * Search for the tags with the geographiesTagText tag configured
        * @memberOf widgets/leftPanel/leftPanel
        */
        _searchGeoTag: function (tag, geoTag) {
            var geoTagValue = tag.toLowerCase().indexOf(geoTag.toLowerCase());
            return geoTagValue;
        }
    });

    declare("TagCloudObj", null, {

        /**
        *Generate the Tag cloud based on the inputs provided
        * @memberOf widgets/leftPanel/leftPanel
        */
        generateTagCloud: function (tagsCollection) {
            var fontSizeArray, tagCloudTags;

            fontSizeArray = this._generateFontSize(dojo.configData.values.tagCloudFontMinValue, dojo.configData.values.tagCloudFontMaxValue, tagsCollection.length);
            tagCloudTags = this._mergeTags(tagsCollection, fontSizeArray);
            return tagCloudTags;
        },

        /**
        * Identify maximum used tags
        * @memberOf widgets/leftPanel/leftPanel
        */
        _identifyMaxUsedTags: function (tagsCollection) {
            var i, maxUsedTags = [];

            for (i = 0; i < tagsCollection.length; i++) {
                maxUsedTags.push(tagsCollection[i]);
            }
            return maxUsedTags;
        },

        /**
        * Generate the required font ranges for each and every tag in tag cloud
        * @memberOf widgets/leftPanel/leftPanel
        */
        _generateFontSize: function (min, max, count) {
            var i, diff, nextValue, fontSizeArray = [];

            diff = ((max - min) / (count - 1));
            fontSizeArray.push(min);
            for (i = 1; i < count; i++) {
                nextValue = fontSizeArray[i - 1] + diff;
                fontSizeArray.push(nextValue);
            }
            return fontSizeArray.sort(function (a, b) {
                if (a > b) {
                    return -1;
                }
                if (a < b) {
                    return 1;
                }
                return 0;
            });
        },

        /**
        * Merge the displayed tags and font ranges in single array
        * @memberOf widgets/leftPanel/leftPanel
        */
        _mergeTags: function (maxUsedTags, fontSizeArray) {
            var i;

            for (i = 0; i < maxUsedTags.length; i++) {
                maxUsedTags[i].fontSize = fontSizeArray[i];
            }
            return maxUsedTags.sort(function (a, b) {
                if (a.key.toLowerCase() < b.key.toLowerCase()) {
                    return -1;
                }
                if (a.key.toLowerCase() > b.key.toLowerCase()) {
                    return 1;
                }
                return 0;
            });
        }
    });

    declare("LeftPanelCollection", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Deferred], {
        templateString: template,
        nls: nls,

        startup: function () {
            dojo.sortBy = dojo.configData.values.sortField;
            if (query(".esriCTSortText")[0]) {
                if ((dojo.sortBy === "modified") && (query(".esriCTSortText")[0].innerHTML !== nls.sortByViewText)) {
                    domAttr.set(query(".esriCTSortText")[0], "innerHTML", nls.sortByViewText);
                } else if ((dojo.sortBy === "numViews") && (query(".esriCTSortText")[0].innerHTML !== nls.sortByDateText)) {
                    domAttr.set(query(".esriCTSortText")[0], "innerHTML", nls.sortByDateText);
                }
            }
            if (dojo.gridView) {
                if (dojo.gridView && (domClass.contains(query(".icon-header")[0], "icon-list"))) {
                    domClass.replace(query(".icon-header")[0], "icon-grid", "icon-list");
                } else if ((!dojo.gridView) && (domClass.contains(query(".icon-header")[0], "icon-grid"))) {
                    domClass.replace(query(".icon-header")[0], "icon-list", "icon-grid");
                }
            }
            this._setGroupContent();
            this._expandGroupdescEvent(this.expandGroupDescription, this);
            this._queryGroupItems();
            domAttr.set(this.leftPanelHeader, "innerHTML", dojo.configData.values.applicationName);
            topic.subscribe("queryGroupItems", this._queryGroupItems);
        },

        /*
        * @memberOf widgets/leftPanel/leftPanel
        * Store the item details in an array
        */
        _queryGroupItems: function (nextQuery, queryString) {
            var _self = this, groupItems = [], defObj = new Deferred();

            if ((!nextQuery) && (!queryString)) {
                dojo.queryString = 'group:("' + dojo.configData.values.group + '")';
                topic.publish("queryGroupItem", dojo.queryString, dojo.sortBy, dojo.configData.values.sortOrder.toLowerCase(), defObj);
            } else if (!queryString) {
                topic.publish("queryGroupItem", null, null, null, defObj, nextQuery);
            }
            if (queryString) {
                dojo.queryString = queryString;
                topic.publish("queryGroupItem", dojo.queryString, dojo.sortBy, dojo.configData.values.sortOrder.toLowerCase(), defObj);
            }

            defObj.then(function (data) {
                var i;

                if (data.results.length > 0) {
                    if (data.nextQueryParams.start !== -1) {
                        for (i = 0; i < data.results.length; i++) {
                            groupItems.push(data.results[i]);
                        }
                        _self._queryGroupItems(data.nextQueryParams);
                    } else {
                        for (i = 0; i < data.results.length; i++) {
                            groupItems.push(data.results[i]);
                        }
                        dojo.groupItems = groupItems;
                        _self._setLeftPanelContent(groupItems);
                    }
                } else {
                    if (queryString) {
                        alert(nls.errorMessages.noPublicItems);
                    }
                }
            }, function (err) {
                alert(err.message);
            });
        },

        /**
        * Create the categories and geographies tag cloud container
        * @memberOf widgets/leftPanel/leftPanel
        */
        _setLeftPanelContent: function (results) {
            var uniqueTags, tagsObj, tagCloud, displayCategoryTags, defObj, queryString, tagContainerHeight;

            dojo.selectedTags = "";
            dojo.tagCloudArray = [];
            if (dojo.configData.values.showTagCloud) {
                uniqueTags = new CollectUniqueTags();
                tagsObj = uniqueTags.collectTags(results);
                tagCloud = new TagCloudObj();
                if (!dojo.configData.values.tagCloudFontMinValue && !dojo.configData.values.tagCloudFontMaxValue && dojo.configData.values.tagCloudFontUnits) {
                    dojo.configData.values.tagCloudFontMinValue = 10;
                    dojo.configData.values.tagCloudFontMaxValue = 18;
                    dojo.configData.values.tagCloudFontUnits = "px";
                }
                if (dojo.configData.values.tagCloudFontMinValue > dojo.configData.values.tagCloudFontMaxValue) {
                    alert(nls.errorMessages.minfontSizeGreater);
                    return;
                }
                if (dojo.configData.values.showTagCloud && tagsObj.groupItemsTagsdata) {
                    domStyle.set(this.tagsCategoriesContent, "display", "block");
                    uniqueTags.setNodeValue(this.tagsCategories, nls.tagHeaderText);

                    displayCategoryTags = tagCloud.generateTagCloud(tagsObj.groupItemsTagsdata);
                    this.displayTagCloud(displayCategoryTags, this.tagsCategoriesCloud, this.tagsCategories.innerHTML);
                }
            }
            this._appendLeftPanel();
            if (dojo.configData.values.showTagCloud) {
                tagContainerHeight = window.innerHeight - (domGeom.position(query(".esriCTCategoriesHeader")[0]).h + domGeom.position(query(".esriCTMenuTab")[0]).h + domGeom.position(this.groupPanel).h + 50) + "px";
                domStyle.set(query(".esriCTPadding")[0], "height", tagContainerHeight);
            }
            defObj = new Deferred();
            queryString = 'group:("' + dojo.configData.values.group + '")';
            /**
            *if searchString exists in the config file, perform a default search with the specified string
            * @memberOf widgets/leftPanel/leftPanel
            */
            if (dojo.configData.values.searchString) {
                queryString += ' AND (';
                queryString += ' title:' + dojo.configData.values.searchString;
                queryString += ' OR tags:' + dojo.configData.values.searchString;
                queryString += ' OR typeKeywords:' + dojo.configData.values.searchString;
                queryString += ' OR snippet:' + dojo.configData.values.searchString;
                queryString += ' ) ';
            }

            /**
            * if searchType exists in the config file, perform a default type search with the specified string
            * @memberOf widgets/leftPanel/leftPanel
            */
            if (dojo.configData.values.searchType) {
                queryString += ' AND type:' + dojo.configData.values.searchType;
            }

            dojo.queryString = queryString;
            dojo.sortBy = dojo.configData.values.sortField;
            topic.publish("queryGroupItem", dojo.queryString, dojo.sortBy, dojo.configData.values.sortOrder.toLowerCase(), defObj);
            defObj.then(function (data) {
                topic.publish("showProgressIndicator");
                dojo.nextQuery = data.nextQueryParams;
                var gallery = new ItemGallery();
                dojo.results = data.results;
                gallery.createItemPods(data.results, false, data.total);
            }, function (err) {
                alert(err.message);
            });
        },

        /**
        * Create the required HTML for generating the tag cloud
        * @memberOf widgets/leftPanel/leftPanel
        */
        displayTagCloud: function (displayTags, node, text) {
            var i, span;

            for (i = 0; i < displayTags.length; i++) {
                span = domConstruct.place(domConstruct.create('h3'), node);
                domClass.add(span, "esriCTTagCloud");
                domStyle.set(span, "fontSize", displayTags[i].fontSize + dojo.configData.values.tagCloudFontUnits);
                if (i !== (displayTags.length - 1)) {
                    domAttr.set(span, "innerHTML", displayTags[i].key + "  ");
                } else {
                    domAttr.set(span, "innerHTML", displayTags[i].key);
                }
                domAttr.set(span, "selectedTagCloud", text);
                domAttr.set(span, "tagCloudValue", displayTags[i].key);
                span.onclick = this._makeSelectedTagHandler();
            }
        },

        /**
        * Creates a handler for a click on a tag
        * @memberOf widgets/leftPanel/leftPanel
        */
        _makeSelectedTagHandler: function () {
            var _self = this;

            return function () {
                var val, index;

                topic.publish("showProgressIndicator");
                if (query(".esriCTNoResults")[0]) {
                    domConstruct.destroy(query(".esriCTNoResults")[0]);
                }
                val = domAttr.get(this, "tagCloudValue");
                if (domClass.contains(this, "esriCTTagCloudHighlight")) {
                    domClass.remove(this, "esriCTTagCloudHighlight");
                    index = array.indexOf(dojo.tagCloudArray, val);
                    if (index > -1) {
                        dojo.tagCloudArray.splice(index, 1);
                    }
                } else {
                    domClass.add(this, "esriCTTagCloudHighlight");
                    dojo.tagCloudArray.push(val);
                }

                if (domGeom.position(query(".esriCTAutoSuggest")[0]).h > 0) {
                    domClass.replace(query(".esriCTAutoSuggest")[0], "displayNoneAll", "displayBlockAll");
                }

                if (dojo.selectedTags !== "") {
                    dojo.selectedTags = dojo.tagCloudArray.join('"' + " AND " + '"');
                } else {
                    dojo.selectedTags = val;
                }
                _self._queryRelatedTags(dojo.selectedTags);

                if (query(".esriCTInnerRightPanelDetails")[0]) {
                    domClass.replace(query(".esriCTMenuTabRight")[0], "displayBlockAll", "displayNoneAll");
                    domClass.add(query(".esriCTInnerRightPanelDetails")[0], "displayNoneAll");
                    domClass.remove(query(".esriCTGalleryContent")[0], "displayNoneAll");
                    domClass.remove(query(".esriCTInnerRightPanel")[0], "displayNoneAll");
                    domClass.replace(query(".esriCTApplicationIcon")[0], "esriCTCursorDefault", "esriCTCursorPointer");
                }
            };
        },

        /**
        * Executed on the click of a tag cloud and queries to fetch items containing the selected tag cloud
        * @memberOf widgets/leftPanel/leftPanel
        */
        _queryRelatedTags: function (tagName) {
            var defObj = new Deferred();
            dojo.queryString = 'group:("' + dojo.configData.values.group + '")' + ' AND (tags: ("' + tagName + '"))';
            topic.publish("queryGroupItem", dojo.queryString, dojo.sortBy, dojo.configData.values.sortOrder.toLowerCase(), defObj);
            defObj.then(lang.hitch(this, function (data) {
                if (data.total === 0) {
                    this._createNoDataContainer();
                } else {
                    if (query(".esriCTNoResults")[0]) {
                        domConstruct.destroy(query(".esriCTNoResults")[0]);
                    }
                    domClass.replace(query(".esriCTInnerRightPanel")[0], "displayBlockAll", "displayNoneAll");
                    dojo.nextQuery = data.nextQueryParams;
                    dojo.results = data.results;
                    topic.publish("createPods", data.results, true);
                }
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        _createNoDataContainer: function () {
            if (query(".esriCTInnerRightPanel")[0]) {
                domClass.replace(query(".esriCTInnerRightPanel")[0], "displayNoneAll", "displayBlockAll");
            }
            if (query(".esriCTNoResults")[0]) {
                domConstruct.destroy(query(".esriCTNoResults")[0]);
            }
            domConstruct.create('div', { "class": "esriCTDivClear esriCTNoResults", "innerHTML": nls.noResultsText }, query(".esriCTRightPanel")[0]);
            if (domClass.contains(query(".esriCTInnerRightPanel")[0], "displayNone")) {
                domClass.replace(query(".esriCTNoResults")[0], "displayNoneAll", "displayBlockAll");
            } else {
                domClass.replace(query(".esriCTNoResults")[0], "displayBlockAll", "displayNoneAll");
            }
            topic.publish("hideProgressIndicator");
        },

        /**
        *Shrinks or expands the group description content on the left panel based on the click event
        * @memberOf widgets/leftPanel/leftPanel
        */
        _expandGroupdescEvent: function (node, _self) {
            node.onclick = function () {
                if (this.innerHTML === nls.expandGroupDescText) {
                    domAttr.set(this, "innerHTML", nls.shrinkGroupDescText);
                    var height = window.innerHeight - (domGeom.position(query(".esriCTMenuTab")[0]).h + domGeom.position(query(".esriCTInnerLeftPanelBottom")[0]).h + domGeom.position(query(".esriCTLogo")[0]).h + 50) + "px";
                    domStyle.set(query(".esriCTLeftPanelDesc")[0], "maxHeight", height);
                } else {
                    domAttr.set(this, "innerHTML", nls.expandGroupDescText);
                }
                domClass.toggle(_self.groupDesc, "esriCTLeftTextReadLess");
            };
        },

        /**
        * Sets the required group content in the containers
        * @memberOf widgets/leftPanel/leftPanel
        */
        _setGroupContent: function () {
            var _self = this;
            if (dojo.configData.groupIcon) {
                _self.groupLogo.src = dojo.configData.groupIcon;
            }
            if (dojo.configData.groupTitle) {
                _self.setNodeText(_self.groupName, dojo.configData.groupTitle);
            }
            if (dojo.configData.groupDescription) {
                _self.setNodeText(_self.groupDesc, dojo.configData.groupDescription);
                if (query(_self.groupDesc).text().length > 400) {
                    domClass.add(_self.groupDesc, "esriCTLeftTextReadLess");
                    if (nls.expandGroupDescText) {
                        _self.setNodeText(_self.expandGroupDescription, nls.expandGroupDescText);
                    }
                }
            }
            if (dojo.configData.values.applicationName) {
                _self.setNodeText(_self.groupDescPanelHeader, dojo.configData.values.applicationName);
                topic.publish("setGrpContent");
            }
        },

        /**
        *Used to set the innerHTML
        * @memberOf widgets/leftPanel/leftPanel
        */
        setNodeText: function (node, htmlString) {
            if (node) {
                domAttr.set(node, "innerHTML", htmlString);
            }
        },

        /**
        * Append the left panel to parent container
        */
        _appendLeftPanel: function () {
            var applicationHeaderDiv = dom.byId("esriCTParentDivContainer");
            domConstruct.place(this.galleryandPannels, applicationHeaderDiv);
        }
    });
});
