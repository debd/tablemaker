<?php

/**
 * Table Maker plugin for Craft CMS 3.x
 *
 * A user-definable table field type for Craft CMS
 *
 * @link      http://www.supercooldesign.co.uk/
 * @copyright Copyright (c) 2018 Supercool Ltd
 */

namespace debd\tablemaker\fields;

use debd\tablemaker\assets\FieldAsset;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use yii\db\Schema;
use craft\helpers\Json;
use craft\helpers\Template;
use function addslashes;

/**
 * @author    Supercool Ltd
 * @package   TableMaker
 * @since     1.0.0
 */
class TableMakerField extends Field
{
    // Public Properties
    // =========================================================================

    public $columnsLabel;
    public $columnsInstructions;
    public $columnsAddRowLabel;
    public $rowsLabel;
    public $rowsInstructions;
    public $rowsAddRowLabel;
    public $columnsIncludeShow;
    public $columnsIncludeDisplayheading;
    public $columnsIncludeMetaheading;
    public $columnsIncludeWidth;


    // Static Methods
    // =========================================================================

    /**
     * Returns the display name of this field type.
     *
     * @return string The display name of this field type.
     */
    public static function displayName(): string
    {
        return Craft::t('tablemaker', 'Table Maker');
    }


    // Public Methods
    // =========================================================================

    /**
     * Returns the validation rules for attributes.
     *
     * Validation rules are used by [[validate()]] to check if attribute values are valid.
     * Child classes may override this method to declare different validation rules.
     *
     * More info: http://www.yiiframework.com/doc-2.0/guide-input-validation.html
     *
     * @return array
     */
    public function rules()
    {
        $rules = parent::rules();
        return $rules;
    }


    /**
     * Returns the column type that this field should get within the content table.
     *
     * This method will only be called if [[hasContentColumn()]] returns true.
     *
     * @return string The column type. [[\yii\db\QueryBuilder::getColumnType()]] will be called
     * to convert the give column type to the physical one. For example, `string` will be converted
     * as `varchar(255)` and `string(100)` becomes `varchar(100)`. `not null` will automatically be
     * appended as well.
     * @see \yii\db\QueryBuilder::getColumnType()
     */
    public function getContentColumnType(): string
    {
        return Schema::TYPE_TEXT;
    }


    /**
     * Normalizes the field’s value for use.
     *
     * This method is called when the field’s value is first accessed from the element. For example, the first time
     * `entry.myFieldHandle` is called from a template, or right before [[getInputHtml()]] is called. Whatever
     * this method returns is what `entry.myFieldHandle` will likewise return, and what [[getInputHtml()]]’s and
     * [[serializeValue()]]’s $value arguments will be set to.
     *
     * @param mixed $value The raw field value
     * @param ElementInterface|null $element The element the field is associated with, if there is one
     *
     * @return mixed The prepared field value
     */
    public function normalizeValue($value, ElementInterface $element = null)
    {

        if (!is_array($value)) {
            $value = Json::decode($value);
        }

        if (!isset($value['rows'])) {
            $value['rows'] = [];
        }

        // make an html table
        $html = '
            <table>
                <thead>
                    <tr>
        ';

        if (!empty($value['columns'])) {
            foreach ($value['columns'] as $col) {
                $show = isset($col['show']) ? 'data-show="' . $col['show'] . '"' : '';
                $width = isset($col['columnWidth']) ? 'width="' . $col['columnWidth'] . '"' : '';
                $displayheading = isset($col['displayheading']) ? 'data-displayheading="' . addslashes($col['displayheading']) . '"' : '';
                $metaheading = isset($col['metaheading']) ? 'data-metaheading="' . addslashes($col['metaheading']) . '"' : '';

                $html .= '<th ' . $width . ' ' . $show . '  ' . $displayheading . ' ' . $metaheading . '>' . $col['heading'] . '</th>';
            }
        }

        $html .= '
                    </tr>
                </thead>

                <tbody>

        ';

        if (!empty($value['rows'])) {

            foreach ($value['rows'] as $row) {

                $html .= '<tr>';

                $i = 0;
                foreach ($row as $key => $cell) {
                    $html .= '<td>' . $cell . '</td>';
                    $i++;
                }

                $html .= '</tr>';
            }
        }

        $html .= '

                </tbody>

            </table>
        ';

        $value['table'] = Template::raw($html);

        return $value;
    }


    /**
     * Modifies an element query.
     *
     * This method will be called whenever elements are being searched for that may have this field assigned to them.
     *
     * If the method returns `false`, the query will be stopped before it ever gets a chance to execute.
     *
     * @param ElementQueryInterface $query The element query
     * @param mixed $value The value that was set on this field’s corresponding [[ElementCriteriaModel]] param,
     *                                     if any.
     *
     * @return null|false `false` in the event that the method is sure that no elements are going to be found.
     */
    public function serializeValue($value, ElementInterface $element = null)
    {

        if (!empty($value['rows']) && is_array($value['rows'])) {
            // drop keys from the rows array
            $value['rows'] = array_values($value['rows']);

            // loop each row
            foreach ($value['rows'] as &$row) {
                if (is_array($row)) {
                    // drop those array keys
                    $row = array_values($row);
                }
            }
        }

        // // drop keys from the columns array
        if (!empty($value['columns']) && is_array($value['columns'])) {
            $value['columns'] = array_values($value['columns']);
        }

        return parent::serializeValue($value, $element);
    }


    /**
     * Returns the component’s settings HTML.
     *
     * @return string|null
     */
    public function getSettingsHtml()
    {
        // Render the settings template
        return Craft::$app->getView()->renderTemplate(
            'tablemaker/_components/fields/_settings',
            [
                'field' => $this,
            ]
        );
    }


    /**
     * Returns the field’s input HTML.
     *
     * @param mixed $value The field’s value. This will either be the [[normalizeValue() normalized value]],
     *                                               raw POST data (i.e. if there was a validation error), or null
     * @param ElementInterface|null $element The element the field is associated with, if there is one
     *
     * @return string The input HTML.
     */
    public function getInputHtml($value, ElementInterface $element = null): string
    {
        $view = Craft::$app->getView();
        $fieldSettings = $this->getSettings();

        // Register our asset bundle
        $view->registerAssetBundle(FieldAsset::class);

        $name = $this->handle;

        $columnsInput = $name . '[columns]';
        $rowsInput = $name . '[rows]';

        $columnsInputId = $name . '-columns';
        $rowsInputId = $name . '-rows';

        // make input
        $input = '<input class="table-maker-field" type="hidden" name="' . $name . '" value="">';

        // get columns from db or fall back to default
        if (!empty($value['columns'])) {
            foreach ($value['columns'] as $key => $val) {
                $columns['col' . $key] = [
                    'heading' => $val['heading'],
                    'type' => 'singleline'
                ];

                if ($fieldSettings['columnsIncludeShow'] && isset($val['show'])) {
                    $columns['col' . $key]['show'] = $val['show'];
                }

                if ($fieldSettings['columnsIncludeDisplayheading'] && isset($val['displayheading'])) {
                    $columns['col' . $key]['displayheading'] = $val['displayheading'];
                }           

                if ($fieldSettings['columnsIncludeMetaheading'] && isset($val['metaheading'])) {
                    $columns['col' . $key]['metaheading'] = $val['metaheading'];
                }

                if ($fieldSettings['columnsIncludeWidth'] && isset($val['columnWidth'])) {
                    $columns['col' . $key]['columnWidth'] = $val['columnWidth'];
                }
            }
        } else {
            $columns = [
                'col0' => [
                    'heading' => '',
                    'align' => '',
                    'width' => '',
                    'type' => 'singleline'
                ]
            ];

            if ($fieldSettings['columnsIncludeShow']) {
                $columns['col1'] = [
                    'heading' => '',
                    'align' => '',
                    'width' => 50,
                    'type' => 'checkbox'
                ];
            }

            if ($fieldSettings['columnsIncludeDisplayheading']) {
                $columns['col1'] = [
                    'heading' => '',
                    'align' => '',
                    'width' => '',
                    'type' => 'singleline'
                ];
            }            

            if ($fieldSettings['columnsIncludeMetaheading']) {
                $columns['col1'] = [
                    'heading' => '',
                    'align' => '',
                    'width' => '',
                    'type' => 'singleline'
                ];
            }

            if ($fieldSettings['columnsIncludeWidth']) {
                $columns['col1'] = [
                    'heading' => '',
                    'align' => '',
                    'width' => '',
                    'type' => 'number'
                ];
            }
        }


        // get rows from db or fall back to default
        if (!empty($value['rows'])) {
            // walk down the rows and cells appending 'row' to the rows' keys
            // and 'col' to the cells' keys
            foreach ($value['rows'] as $rowKey => $rowVal) {
                foreach ($rowVal as $colKey => $colVal) {
                    $rows['row' . $rowKey]['col' . $colKey] = $colVal;
                }
            }
        } else {
            $rows = ['row0' => []];
        }

        // prep col settings
        $columnSettings = [
            'heading' => [
                'heading' => Craft::t('tablemaker', 'Heading'),
                'type' => 'singleline'
            ],
        ];

        if ($fieldSettings['columnsIncludeShow']) {
            $columnSettings['show'] = [
                'heading' => Craft::t('tablemaker', 'Show Column'),
                'type' => 'checkbox',
                'width' => 50
            ];
        }    

        if ($fieldSettings['columnsIncludeDisplayheading']) {
            $columnSettings['displayheading'] = [
                'heading' => Craft::t('tablemaker', 'Display Heading'),
                'type' => 'singleline'
            ];
        }        
        
        if ($fieldSettings['columnsIncludeMetaheading']) {
            $columnSettings['metaheading'] = [
                'heading' => Craft::t('tablemaker', 'Meta Heading'),
                'type' => 'singleline'
            ];
        }
        if ($fieldSettings['columnsIncludeWidth']) {
            $columnSettings['columnWidth'] = [
                'heading' => Craft::t('tablemaker', 'Width'),
                'type' => 'singleline',
                'width' => 100,
            ];
        }

        // init the js
        $view->registerJs('new Craft.TableMaker(' .
            Json::encode($view->namespaceInputId($name), JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($view->namespaceInputId($columnsInputId), JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($view->namespaceInputId($rowsInputId), JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($view->namespaceInputName($columnsInput), JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($view->namespaceInputName($rowsInput), JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($columns, JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($rows, JSON_UNESCAPED_UNICODE) . ', ' .
            Json::encode($columnSettings, JSON_UNESCAPED_UNICODE) .
            ');');

        // render the two tables
        $fieldSettings = $this->getSettings();
        $columnsField = $view->renderTemplateMacro('_includes/forms', 'editableTableField', [
            [
                'label' => $fieldSettings['columnsLabel'] ? Craft::t('tablemaker', $fieldSettings['columnsLabel']) : Craft::t('tablemaker', 'Table Columns'),
                'instructions' => $fieldSettings['columnsInstructions'] ? Craft::t('tablemaker', $fieldSettings['columnsInstructions']) : Craft::t('tablemaker', 'Define the columns your table should have.'),
                'id' => $columnsInputId,
                'name' => $columnsInput,
                'cols' => $columnSettings,
                'rows' => $columns,
                'fieldClass' => 'tablemaker-columns',
                'addRowLabel' => $fieldSettings['columnsAddRowLabel'] ? Craft::t('tablemaker', $fieldSettings['columnsAddRowLabel']) : Craft::t('tablemaker', 'Add a column'),
                'initJs' => false
            ]
        ]);

        $rowsField = $view->renderTemplateMacro('_includes/forms', 'editableTableField', [
            [
                'label' => $fieldSettings['rowsLabel'] ? Craft::t('tablemaker', $fieldSettings['rowsLabel']) : Craft::t('tablemaker', 'Table Content'),
                'instructions' => $fieldSettings['rowsInstructions'] ? Craft::t('tablemaker', $fieldSettings['rowsInstructions']) : Craft::t('tablemaker', 'Input the content of your table.'),
                'id' => $rowsInputId,
                'name' => $rowsInput,
                'cols' => $columns,
                'rows' => $rows,
                'fieldClass' => 'tablemaker-rows',
                'addRowLabel' => $fieldSettings['rowsAddRowLabel'] ? Craft::t('tablemaker', $fieldSettings['rowsAddRowLabel']) : Craft::t('tablemaker', 'Add a row'),
                'initJs' => false
            ]
        ]);

        return $input . $columnsField . $rowsField;
    }


}
