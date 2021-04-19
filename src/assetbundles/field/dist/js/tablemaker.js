/**
 * Table Maker plugin for Craft CMS
 *
 *  Field JS
 *
 * @author    Supercool Ltd
 * @copyright Copyright (c) 2018 Supercool Ltd
 * @link      http://www.supercooldesign.co.uk/
 * @package   TableMaker
 * @since     1.0.0TableMaker
 */

;(function($, window, document, undefined) {

  var pluginName = "TableMaker",
    defaults = {};

  // Plugin constructor
  function Plugin(element, options) {
    this.element = element;

    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  Plugin.prototype = {

    init: function(id) {
      var _this = this;

      $(function() {

        /* -- _this.options gives us access to the $jsonVars that our FieldType passed down to us */

      });
    }
  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName,
          new Plugin(this, options));
      }
    });
  };


  /**
   * TableMaker Class
   *
   * An awful lot of this is taken directly from TableFieldsSettings.js
   */
  Craft.TableMaker = Garnish.Base.extend(
    {

      columnsTableId: null,
      rowsTableId: null,
      columnsTableName: null,
      rowsTableName: null,
      columnsTableInputPath: null,
      rowsTableInputPath: null,
      columns: null,
      rows: null,
      columnSettings: null,
      fieldId: null,

      columnsTable: null,
      rowsTable: null,

      $columnsTable: null,
      $rowsTable: null,
      $input: null,

      init: function(fieldId, columnsTableId, rowsTableId, columnsTableName, rowsTableName, columns, rows, columnSettings) {

        this.columnsTableId = columnsTableId;
        this.rowsTableId = rowsTableId;

        this.columnsTableName = columnsTableName;
        this.rowsTableName = rowsTableName;

        this.columnsTableInputPath = this.columnsTableId.split('-');
        this.rowsTableInputPath = this.rowsTableId.split('-');

        this.columns = columns;
        this.rows = rows;

        this.columnSettings = columnSettings;
        this.fieldId = fieldId


        this.$columnsTable = $('#' + this.columnsTableId);
        this.$rowsTable = $('#' + this.rowsTableId);
        this.$input = $('#' + fieldId + '-field').find('input.table-maker-field');


        // set up columns table
        this.initColumnsTable();

        // set up rows table
        this.initRowsTable();

        $(document).on('copy', this.onCopy.bind(this));

        this.addListener($('body'), 'mouseup', 'onBodyMouseup');

        // make the data blob
        this.makeDataBlob();

      },

      onColumnsAddRow: function() {

        this.bindColumnsTableChanges();
        this.reconstructRowsTable();

      },

      onRowsAddRow: function() {

        this.bindRowsTableTextChanges();
        this.makeDataBlob();

      },

      bindColumnsTableChanges: function() {

        // text changes
        var $textareas = this.columnsTable.$tbody.find('textarea');
        this.addListener($textareas, 'textchange', 'reconstructRowsTable');
        this.addListener($textareas, 'paste', 'onPaste');

        // select changes
        var $selects = this.columnsTable.$tbody.find('select');
        this.addListener($selects, 'change', 'reconstructRowsTable');

        // checkbox changes
        var $checkboxes = this.columnsTable.$tbody.find('input[type=checkbox]');
        this.addListener($checkboxes, 'change', 'reconstructRowsTable');
      },

      bindRowsTableTextChanges: function() {

        var $textareas = this.rowsTable.$tbody.find('textarea');
        this.addListener($textareas, 'textchange', 'makeDataBlob');
        this.addListener($textareas, 'paste', 'onPaste');
      },

      initColumnsTable: function() {

        this.columnsTable = new Craft.EditableTable(this.columnsTableId, this.columnsTableName, this.columnSettings, {
          rowIdPrefix: 'col',
          onAddRow: $.proxy(this, 'onColumnsAddRow'),
          onDeleteRow: $.proxy(this, 'reconstructRowsTable')
        });

        this.bindColumnsTableChanges();

        this.columnsTable.sorter.settings.onSortChange = $.proxy(this, 'reconstructRowsTable');
        $('table#fields-columns').on('mousedown', 'textarea', this.onMousedown.bind(this));
        $('table#fields-columns').on('mouseup', 'textarea', this.onMouseup.bind(this));
      },

      initRowsTable: function() {

        this.rowsTable = new Craft.EditableTable(this.rowsTableId, this.rowsTableName, this.columns, {
          rowIdPrefix: 'row',
          onAddRow: $.proxy(this, 'onRowsAddRow'),
          onDeleteRow: $.proxy(this, 'makeDataBlob')
        });

        this.bindRowsTableTextChanges();

        this.rowsTable.sorter.settings.onSortChange = $.proxy(this, 'makeDataBlob');
        $('table#fields-rows').on('mousedown', 'textarea', this.onMousedown.bind(this));
        $('table#fields-rows').on('mouseup', 'textarea', this.onMouseup.bind(this));
      },

      reconstructRowsTable: function() {

        // get data
        this.getDataFromTables();

        // prep table
        var tableHtml = '<thead>' +
          '<tr>';

        // re-do columns of rowsTable
        for (var colId in this.columns) {
          // force type of col to be textual
          this.columns[colId].type = 'singleline';
          var heading = (this.columns[colId].heading ? this.columns[colId].heading : '&nbsp;');
          if (this.columns[colId].metaheading) {
            heading += ' (' + this.columns[colId].metaheading + ')';
          }
          tableHtml += '<th scope="col" class="header">' + heading + '</th>';
        }

        tableHtml += '<th class="header" colspan="2"></th>' +
          '</tr>' +
          '</thead>';

        var $table = $('<table/>', {
          id: this.rowsTableId,
          'class': 'editable shadow-box'
        }).append(tableHtml);

        var $tbody = $('<tbody/>').appendTo($table);

        // merge in the current rows content
        for (var rowId in this.rows) {
          if (!this.rows.hasOwnProperty(rowId)) {
            continue;
          }

          Craft.EditableTable.createRow(rowId, this.columns, this.rowsTableName, this.rows[rowId]).appendTo($tbody);
        }


        this.rowsTable.$table.replaceWith($table);
        this.rowsTable.destroy();
        delete this.rowsTable;
        this.initRowsTable(this.columns);
        this.makeDataBlob();
      },

      getDataFromTables: function() {

        // get data out from the tables
        var columns = Craft.expandPostArray(Garnish.getPostData(this.columnsTable.$tbody)),
          rows = Craft.expandPostArray(Garnish.getPostData(this.rowsTable.$tbody));

        // travel down the input paths to find where the data we’re interested in actually is

        if (!$.isEmptyObject(columns)) {

          for (var i = 0; i < this.columnsTableInputPath.length; i++) {
            var key = this.columnsTableInputPath[i];
            columns = columns[key];
          }

        }

        this.columns = columns;

        if (!$.isEmptyObject(rows)) {

          for (var i = 0; i < this.rowsTableInputPath.length; i++) {
            var key = this.rowsTableInputPath[i];
            rows = rows[key];
          }

        }

        this.rows = rows;

      },

      makeDataBlob: function() {

        // get data
        this.getDataFromTables();

        var dataBlob = {
          'columns': this.columns,
          'rows': this.rows
        };

        this.$input.val(JSON.stringify(dataBlob));
      },

      onPaste: function(e) {
        var debug = false;

        try {
          var srcHtml = e.originalEvent.clipboardData.getData('text/html');
          var $srcHtml = $(srcHtml);
          var targetElement = e.originalEvent.target;
          var $targetElement = $(targetElement);
          var $srcRows = $srcHtml.find('tr');

          // Need to figure out if we have enough target rows for the src.
          // If not, we will have to create new rows first

          var $targetParent = $targetElement.parent('td').parent('tr');
          var targetTdIndex = $targetParent.children('td').index($targetElement.parent('td'));
          var $targetRows = $targetParent.nextAll('tr').addBack();
          var $targetParentSiblings = $targetParent.nextAll('tr');
          if ($srcRows.length > $targetRows.length) {
            var rowsNeeded = $srcRows.length - $targetRows.length;
            // Are we in columns table or rows table?
            var $table = $targetElement.parents('table');
            var editableTable;
            if ($table.attr('id') === 'fields-columns') {
              editableTable = this.columnsTable;
            } else if ($table.attr('id') === 'fields-rows') {
              editableTable = this.rowsTable;
            } else {
              return;
            }

            // Add the needed rows

            for (var i = 0; i < rowsNeeded; i++) {
              editableTable.addRow();
            }

            $targetRows = $targetParent.nextAll('tr').addBack();	// make sure we get all rows

          }

          // Now copy the data!

          var columnsToCopy = Math.min($srcRows.first().find('td').length, $targetElement.parent('td').nextAll('td').addBack().filter(':has(textarea)').length);
          for (var rowIdx = 0; rowIdx < $srcRows.length; rowIdx++) {
            var $srcRow = $srcRows.eq(rowIdx);
            var $srcCells = $srcRow.children('td');
            var $targetRow = $targetRows.eq(rowIdx);
            var $targetOriginTd = $targetRow.children('td').eq(targetTdIndex);
            var $targetTds = $targetOriginTd.nextAll().addBack();
            var $targetCells = $targetTds.find('textarea');

            for (var colIdx = 0; colIdx < columnsToCopy; colIdx++) {
              $targetCells.eq(colIdx).val($.trim($srcCells.eq(colIdx).html()));
            }
          }
          // var destElement = e.originalEvent.
        } catch (err) {
          // If we're not debugging, ignore all errors and return
          if (debug) {
            throw err;
          }
        }

        e.preventDefault();
      },

      startCell: null,
      endCell: null,

      onMousedown: function(e) {
        this.clearSelection();
        this.startCell = e.target;
        $('table#fields-columns, table#fields-rows').on('mouseover', 'textarea', this.onMouseover.bind(this));
      },

      onMouseup: function(e) {
        $('table#fields-columns, table#fields-rows').off('mouseover', 'textarea');
        var endCell = e.target;
        var startTable = $(this.startCell).closest('table');
        var endTable = $(endCell).closest('table');
        if (e.target !== this.startCell && startTable.get(0) === endTable.get(0)) {
          e.stopPropagation();
        }
      },

      onBodyMouseup: function(e) {
        $('table#fields-columns, table#fields-rows').off('mouseover', 'textarea');
        this.clearSelection();
        this.startCell = this.endCell = null;
      },

      clearSelection: function(rmTextSelection) {
        $('table#fields-columns td.selected, table#fields-rows td.selected').removeClass('selected');
        if (rmTextSelection) {
          if (window.getSelection) {
            if (window.getSelection().empty) {  // Chrome
              window.getSelection().empty();
            } else if (window.getSelection().removeAllRanges) {  // Firefox
              window.getSelection().removeAllRanges();
            }
          } else if (document.selection) {  // IE?
            document.selection.empty();
          }
        }
      },

      onMouseover: function(e) {
        // Ignore start cell
        if (e.target === this.startCell) {
          return;
        }
        // If mouseover is in different table, ignore
        var startTable = $(this.startCell).closest('table').get(0);
        var endTable = $(e.target).closest('table').get(0);
        if (startTable !== endTable) {
          return;
        }
        this.endCell = e.target;
        this.highlightSelection();
      },

      getSelectionIndices: function() {
        var firstColIndex = $(this.startCell).closest('td').index();
        var firstRowIndex = $(this.startCell).closest('tr').index();
        var lastColIndex = $(this.endCell).closest('td').index();
        var lastRowIndex = $(this.endCell).closest('tr').index();

        var indices = {'row': {}, 'col': {}};

        indices.row.start = Math.min(firstRowIndex, lastRowIndex);
        indices.row.end = Math.max(firstRowIndex, lastRowIndex);
        indices.col.start = Math.min(firstColIndex, lastColIndex);
        indices.col.end = Math.max(firstColIndex, lastColIndex);

        return indices;
      },

      highlightSelection: function() {
        if (this.startCell === null || this.endCell === null) {
          return;
        }
        var indices = this.getSelectionIndices();

        var startTable = $(this.startCell).closest('table');
        // console.log('highlight from (' + indices.col.start + ', ' + indices.row.start + ') to (' + indices.col.end + ', ' + indices.row.end + ')');
        this.clearSelection(true);
        for (var i = indices.row.start; i <= indices.row.end; i++) {
          var tr = startTable.find('tbody tr').eq(i);
          for (var j = indices.col.start; j <= indices.col.end; j++) {
            var td = tr.find('td').eq(j);
            var textarea = td.find('textarea');
            if (textarea && textarea.get(0)) {
              td = textarea.closest('td');
              td.addClass('selected');
            }
          }
        }
      },

      onCopy: function(e) {
        // We only want to deal with copying related to the table...

        if ($('table#fields-columns td.selected, table#fields-rows td.selected').length > 0) {
          var indices = this.getSelectionIndices();
          var startTable = $(this.startCell).closest('table');
          var html = '<table>';
          for (var i = indices.row.start; i <= indices.row.end; i++) {
            var tr = startTable.find('tbody tr').eq(i);
            html += '<tr>';
            for (var j = indices.col.start; j <= indices.col.end; j++) {
              var td = tr.find('td').eq(j);
              var textarea = td.find('textarea');
              if (textarea && textarea.get(0)) {
                html += '<td>' + textarea.text() + '</td>';
              }
            }
            html += '</tr>';
          }
          html += '</table>';

          e.originalEvent.clipboardData.setData('text/html', html);

          e.preventDefault();
        }
      }
    });

})(jQuery, window, document);
