require.config({
paths: 
{"knockout":"empty:","knockout-amd-helpers":"empty:","underscore":"empty:","jquery":"empty:","jquery-ui":"empty:","jqueryui-amd":"empty:","text":"empty:","ojs":"empty:","ojdnd":"empty:","ojL10n":"empty:","hammerjs":"empty:","ojtranslations":"empty:","promise":"empty:","moment":"empty:","require":"empty:","signals":"empty:","RendererViewModel":"renderer/RendererViewModel","ComputedExtension":"renderer/ComputedExtension","RendererCallDefinition":"connector/RendererCallDefinition","AbstractCallDefinition":"connector/AbstractCallDefinition","ResponseMapping":"connector/ResponseMapping","RendererLoadPreProcessor":"renderer/RendererLoadPreProcessor","mediaBindingHandler":"ko/mediaBinding/mediaBindingHandler","MediaQueryType":"ko/mediaBinding/MediaQueryType","MediaQueryInspector":"ko/mediaBinding/MediaQueryInspector","knockoutExtensions":"ko/knockoutExtensions","AsyncTemplateBinding":"ko/asyncTemplate/AsyncTemplateBinding","RenderingQueue":"ko/asyncTemplate/RenderingQueue","AsyncRenderer":"ko/asyncTemplate/AsyncRenderer","RendererId":"RendererId","RendererForm":"renderer/RendererForm","Form":"renderer/Form","SilentLoader":"renderer/silent/SilentLoader","FormExtensions":"renderer/FormExtensions","Presentation":"presentations/Presentation","FormReferenceFactory":"references/FormReferenceFactory","Reference":"references/Reference","StaticFormReference":"references/StaticFormReference","BusinessTypeReference":"references/BusinessTypeReference","Configuration":"configuration/Configuration","ControlTypeId":"controls/ControlTypeId","RendererControlType":"controls/RendererControlType","RendererContext":"context/RendererContext","ObservablePayloadContext":"context/ObservablePayloadContext","FormContext":"context/FormContext","RendererComponent":"RendererComponent","RendererTemplateLoader":"RendererTemplateLoader","Control":"controls/Control","ValueHelper":"controls/ValueHelper","ValueScope":"controls/events/ValueScope","EventReference":"controls/events/EventReference","EventTrigger":"controls/events/EventTrigger","BlockFactory":"controls/events/blocks/BlockFactory","BlockTypes":"controls/events/blocks/BlockTypes","ActionFactory":"controls/events/actions/ActionFactory","EventBlock":"controls/events/blocks/EventBlock","EventActionBlock":"controls/events/blocks/EventActionBlock","EventConnectorBlock":"controls/events/blocks/EventConnectorBlock","EventErrorBlock":"controls/events/blocks/EventErrorBlock","EventIfBlock":"controls/events/blocks/EventIfBlock","EventAction":"controls/events/actions/EventAction","SetPropertyAction":"controls/events/actions/SetPropertyAction","SetStyleAction":"controls/events/actions/SetStyleAction","RefreshConnectorAction":"controls/events/actions/RefreshConnectorAction","RefreshGlobalConnectorAction":"controls/events/actions/RefreshGlobalConnectorAction","ToggleClassAction":"controls/events/actions/ToggleClassAction","AddClassAction":"controls/events/actions/AddClassAction","RemoveClassAction":"controls/events/actions/RemoveClassAction","SetStateAction":"controls/events/actions/SetStateAction","RemoveRowAction":"controls/events/actions/RemoveRowAction","SetValueAction":"controls/events/actions/SetValueAction","SetDataAction":"controls/events/actions/SetDataAction","SetLabelBindingAction":"controls/events/actions/SetLabelBindingAction","ClearValueAction":"controls/events/actions/ClearValueAction","SetRepeatableValueAction":"controls/events/actions/SetRepeatableValueAction","SetOptionsAction":"controls/events/actions/SetOptionsAction","SetImageValueAction":"controls/events/actions/SetImageValueAction","SetMessageValueAction":"controls/events/actions/SetMessageValueAction","SetVideoValueAction":"controls/events/actions/SetVideoValueAction","SetInvalidAction":"controls/events/actions/SetInvalidAction","SelectTabAction":"controls/events/actions/SelectTabAction","AddRowAction":"controls/events/actions/AddRowAction","ControlDefinition":"controls/ControlDefinition","InputControlDefinition":"controls/InputControlDefinition","FormControlDefinition":"controls/FormControlDefinition","ControlFactory":"controls/ControlFactory","ButtonControl":"controls/basic/ButtonControl","InputTextControl":"controls/basic/InputTextControl","TextAreaControl":"controls/basic/TextAreaControl","SelectControl":"controls/basic/SelectControl","LOVControl":"controls/listOfValues/LOVControl","ChecklistControl":"controls/basic/ChecklistControl","CheckboxControl":"controls/basic/CheckboxControl","RadioButtonControl":"controls/basic/RadioButtonControl","NumberControl":"controls/basic/NumberControl","DateControl":"controls/basic/DateControl","TimeControl":"controls/basic/TimeControl","DateTimeControl":"controls/basic/DateTimeControl","EmailControl":"controls/basic/EmailControl","UrlControl":"controls/basic/UrlControl","MessageControl":"controls/basic/MessageControl","LinkControl":"controls/basic/LinkControl","MoneyControl":"controls/advanced/MoneyControl","ImageControl":"controls/advanced/ImageControl","PhoneControl":"controls/advanced/PhoneControl","VideoControl":"controls/advanced/VideoControl","ScopeType":"controls/advanced/identity/ScopeType","IdentityControl":"controls/advanced/IdentityControl","PanelControl":"controls/layout/PanelControl","SectionControl":"controls/layout/SectionControl","TabControl":"controls/layout/TabControl","TableControl":"controls/layout/TableControl","RepeatableSectionControl":"controls/layout/RepeatableSectionControl","RepeatableControl":"controls/layout/RepeatableControl","TableColumnControl":"controls/layout/TableColumnControl","RepeatableRowControl":"controls/layout/RepeatableRowControl","TabContainerControl":"controls/layout/TabContainerControl","HeadingType":"controls/basic/HeadingType","TargetType":"controls/basic/TargetType","LayoutType":"controls/layout/LayoutType","ColumnSpan":"controls/layout/columnManagement/ColumnSpan","ColumnSpanType":"controls/layout/columnManagement/ColumnSpanType","ColumnSpanTypeId":"controls/layout/columnManagement/ColumnSpanTypeId","FormReferenceControl":"controls/form/FormReferenceControl","Icon":"ko/Icon","ActionsMap":"controls/events/actions/ActionsMap","StyleActionsMap":"controls/events/actions/StyleActionsMap","EventCondition":"controls/events/conditional/EventCondition","ComparatorMap":"controls/events/conditional/ComparatorMap","EventActionsMap":"controls/events/controlMaps/EventActionsMap","EventsId":"controls/events/EventsId","ControlEventsMap":"controls/events/controlMaps/ControlEventsMap","HandleEventsBinding":"controls/events/HandleEventsBinding","EventsQueue":"controls/events/EventsQueue","ControlResolver":"controls/ControlResolver","ControlReferenceMap":"controls/events/ControlReferenceMap","FunctionsMap":"controls/events/functions/FunctionsMap","PropertiesMap":"controls/events/properties/PropertiesMap","ControlPropertiesMap":"controls/events/controlMaps/ControlPropertiesMap","ControlProperty":"controls/events/properties/ControlProperty","ControlValueProperty":"controls/events/properties/ControlValueProperty","IndexProperty":"controls/events/properties/IndexProperty","OptionsProperty":"controls/events/properties/OptionsProperty","ControlIdentityValueProperty":"controls/events/properties/ControlIdentityValueProperty","SelectedTabProperty":"controls/events/properties/SelectedTabProperty","HasClassProperty":"controls/events/properties/HasClassProperty","IsValidProperty":"controls/events/properties/IsValidProperty","ControlMessageProperty":"controls/events/properties/ControlMessageProperty","ControlVideoSrcProperty":"controls/events/properties/ControlVideoSrcProperty","ControlImageUrlProperty":"controls/events/properties/ControlImageUrlProperty","SelectedLabelProperty":"controls/events/properties/SelectedLabelProperty","ValidatorBuilder":"validation/ValidatorBuilder","ValidatorTypeId":"validation/ValidatorTypeId","ValidatorFactory":"validation/ValidatorFactory","TypeValidatorFactory":"validation/controlValidators/TypeValidatorFactory","DateValidator":"validation/controlValidators/DateValidator","NumberValidator":"validation/controlValidators/NumberValidator","NumberRangeValidator":"validation/controlValidators/NumberRangeValidator","DateRangeValidator":"validation/controlValidators/DateRangeValidator","MoneyValidator":"validation/controlValidators/MoneyValidator","MinLengthValidator":"validation/validators/MinLengthValidator","MaxLengthValidator":"validation/validators/MaxLengthValidator","PatternValidator":"validation/validators/PatternValidator","RequiredValidator":"validation/validators/RequiredValidator","OptionsFeedValidator":"validation/validators/OptionsFeedValidator","FormValidator":"validation/FormValidator","ValidationHelper":"property/validation/ValidationHelper","Style":"styles/Style","StyleControlMapper":"styles/StyleControlMapper","StyleTypeId":"styles/StyleTypeId","koToJSUtil":"util/koToJSUtil","ContextualHandler":"configuration/ContextualHandler","DefaultRestHandler":"configuration/DefaultRestHandler","DefaultFormHandler":"configuration/DefaultFormHandler","DefaultCssHandler":"configuration/DefaultCssHandler","DefaultTypeHandler":"configuration/DefaultTypeHandler","DefaultConnectorHandler":"configuration/DefaultConnectorHandler","DefaultTranslationsHandler":"configuration/DefaultTranslationsHandler","DependencyType":"dependencies/DependencyType","RestHandlerMock":"mocks/RestHandlerMock","ConnectorHandlerMock":"mocks/ConnectorHandlerMock","FormHandlerMock":"mocks/FormHandlerMock","TypeHandlerMock":"mocks/TypeHandlerMock","CssHandlerMock":"mocks/CssHandlerMock","TranslationsHandlerMock":"mocks/TranslationsHandlerMock","NameGenerator":"util/NameGenerator","StylePreprocessor":"util/StylePreprocessor","TreeUtil":"util/TreeUtil","Value":"util/Value","ValueTypes":"util/ValueTypes","OjSelectItem":"util/OjSelectItem","PayloadUtil":"util/PayloadUtil","DataType":"types/DataType","ArrayType":"types/ArrayType","IdentityType":"types/IdentityType","BooleanType":"types/BooleanType","DateTimeType":"types/DateTimeType","DateType":"types/DateType","EnumType":"types/EnumType","NumberType":"types/NumberType","ObjectType":"types/ObjectType","ObjectTypeRef":"types/ObjectTypeRef","SimpleType":"types/SimpleType","StringType":"types/StringType","TimeType":"types/TimeType","UnknownType":"types/UnknownType","ObjectAttribute":"types/ObjectAttribute","TypeCatalog":"types/TypeCatalog","TypeFactory":"types/TypeFactory","TypeDescription":"types/TypeDescription","ParseStrategy":"types/parser/ParseStrategy","DoNotResolveRefStrategy":"types/parser/DoNotResolveRefStrategy","ResolveRefStrategy":"types/parser/ResolveRefStrategy","Payload":"payload/Payload","JSONConverter":"payload/JSONConverter","Row":"controls/layout/Row","StyleHandler":"styles/StyleHandler","ControlContainer":"controls/layout/ControlContainer","OptionsProperties":"controls/listOfValues/options/properties/OptionsProperties","ConnectorProperties":"controls/listOfValues/options/properties/ConnectorProperties","StaticProperties":"controls/listOfValues/options/properties/StaticProperties","RestProperties":"controls/listOfValues/options/properties/RestProperties","DynamicProperties":"controls/listOfValues/options/properties/DynamicProperties","OptionsPropertiesFactory":"controls/listOfValues/options/properties/OptionsPropertiesFactory","OptionsResolver":"controls/listOfValues/options/resolver/OptionsResolver","ConnectorOptionsResolver":"controls/listOfValues/options/resolver/ConnectorOptionsResolver","ConnectorResolver":"controls/listOfValues/options/resolver/ConnectorResolver","RestOptionsResolver":"controls/listOfValues/options/resolver/RestOptionsResolver","RestResolver":"controls/listOfValues/options/resolver/RestResolver","ListConnectorResolver":"controls/listOfValues/options/resolver/ListConnectorResolver","DynamicOptionsResolver":"controls/listOfValues/options/resolver/DynamicOptionsResolver","DynamicAutoFocus":"controls/listOfValues/options/resolver/DynamicAutoFocus","DynamicDefaultValue":"controls/listOfValues/options/resolver/DynamicDefaultValue","DotExpressionResolver":"controls/listOfValues/options/resolver/DotExpressionResolver","StaticOptionsResolver":"controls/listOfValues/options/resolver/StaticOptionsResolver","OptionsResolverFactory":"controls/listOfValues/options/resolver/OptionsResolverFactory","DynamicOptionType":"controls/listOfValues/options/resolver/DynamicOptionType","OptionsType":"controls/listOfValues/options/OptionsType","OptionsFeed":"controls/listOfValues/options/OptionsFeed","LoVMappingAutoComplete":"controls/listOfValues/options/properties/LoVMappingAutoComplete","InheritableProperty":"property/InheritableProperty","ControlDecorator":"controls/decorators/ControlDecorator","DecoratorsCatalog":"controls/decorators/DecoratorsCatalog","RendererDecoratorsCatalog":"controls/decorators/RendererDecoratorsCatalog","GetOJComponentDecorator":"controls/decorators/general/GetOJComponentDecorator","LazyRenderingDecorator":"controls/decorators/general/LazyRenderingDecorator","ValidationDecorator":"controls/decorators/validation/ValidationDecorator","JetValidationDecorator":"controls/decorators/validation/JetValidationDecorator","ValueDecorator":"controls/decorators/value/ValueDecorator","RepeatableValueDecorator":"controls/decorators/value/RepeatableValueDecorator","VideoValueDecorator":"controls/decorators/value/VideoValueDecorator","SelectValueDecorator":"controls/decorators/value/SelectValueDecorator","DateValueDecorator":"controls/decorators/value/DateValueDecorator","TimeValueDecorator":"controls/decorators/value/TimeValueDecorator","NumberValueDecorator":"controls/decorators/value/NumberValueDecorator","LinkValueDecorator":"controls/decorators/value/LinkValueDecorator","IdentityValueDecorator":"controls/decorators/value/IdentityValueDecorator","CheckboxValueDecorator":"controls/decorators/value/CheckboxValueDecorator","FormReferenceValueDecorator":"controls/decorators/value/FormReferenceValueDecorator","RepeatableRowValueDecorator":"controls/decorators/value/RepeatableRowValueDecorator","BuildFormReferenceDecorator":"controls/decorators/value/BuildFormReferenceDecorator","TimeValidationDecorator":"controls/decorators/validation/TimeValidationDecorator","FormReferenceValidationDecorator":"controls/decorators/validation/FormReferenceValidationDecorator","RepeatableValidationDecorator":"controls/decorators/validation/RepeatableValidationDecorator","TabRenderingDecorator":"controls/decorators/tab/TabRenderingDecorator","TabContainerRenderingDecorator":"controls/decorators/tab/TabContainerRenderingDecorator","SectionRenderingDecorator":"controls/decorators/section/SectionRenderingDecorator","SectionAsyncRenderCallbackDecorator":"controls/decorators/section/SectionAsyncRenderCallbackDecorator","RawDataDecorator":"controls/decorators/input/RawDataDecorator","ReferenceLazyRenderingDecorator":"controls/decorators/formReference/ReferenceLazyRenderingDecorator","FormsLogger":"logger/FormsLogger","EventsTranslator":"translation/EventsTranslator","TranslationsDecorator":"controls/decorators/translation/TranslationsDecorator","DecoratorsMap":"controls/decorators/translation/DecoratorsMap","ComputedValueDecorator":"controls/decorators/translation/ComputedValueDecorator","iconTemplate":"../html/icon/icon.tmpl.html","rendererTemplate":"../html/rendererTemplate.tmpl.html","rendererControl":"../html/controls/control.tmpl.html","columnControl":"../html/controls/columnControl.tmpl.html","rendererSectionRow":"../html/controls/layout/rendererSectionRow.tmpl.html","rendererPanelItem":"../html/controls/layout/rendererPanelItem.tmpl.html","rendererMoneyControl":"../html/controls/advanced/rendererMoneyControl.tmpl.html","rendererButtonControl":"../html/controls/basic/rendererButtonControl.tmpl.html","rendererChecklistControl":"../html/controls/basic/rendererChecklistControl.tmpl.html","rendererCheckboxControl":"../html/controls/basic/rendererCheckboxControl.tmpl.html","rendererDateControl":"../html/controls/basic/rendererDateControl.tmpl.html","rendererDateTimeControl":"../html/controls/basic/rendererDateTimeControl.tmpl.html","rendererEmailControl":"../html/controls/basic/rendererEmailControl.tmpl.html","rendererLinkControl":"../html/controls/basic/rendererLinkControl.tmpl.html","rendererMessageControl":"../html/controls/basic/message/rendererMessageControl.tmpl.html","rendererMessageTypeParagraphTemplate":"../html/controls/basic/message/rendererMessageTypeParagraph.tmpl.html","rendererMessageTypeHeading1Template":"../html/controls/basic/message/rendererMessageTypeHeading1.tmpl.html","rendererMessageTypeHeading2Template":"../html/controls/basic/message/rendererMessageTypeHeading2.tmpl.html","rendererMessageTypeHeading3Template":"../html/controls/basic/message/rendererMessageTypeHeading3.tmpl.html","rendererMessageTypeHeading4Template":"../html/controls/basic/message/rendererMessageTypeHeading4.tmpl.html","rendererMessageTypeHeading5Template":"../html/controls/basic/message/rendererMessageTypeHeading5.tmpl.html","rendererMessageTypeHeading6Template":"../html/controls/basic/message/rendererMessageTypeHeading6.tmpl.html","rendererNumberControl":"../html/controls/basic/rendererNumberControl.tmpl.html","rendererRadioButtonControl":"../html/controls/basic/rendererRadioButtonControl.tmpl.html","rendererSelectControl":"../html/controls/basic/select/rendererSelectControl.tmpl.html","rendererSingleSelectTemplate":"../html/controls/basic/select/rendererSingleSelect.tmpl.html","rendererMultiSelectTemplate":"../html/controls/basic/select/rendererMultiSelect.tmpl.html","rendererTextAreaControl":"../html/controls/basic/rendererTextAreaControl.tmpl.html","rendererTextControl":"../html/controls/basic/rendererTextControl.tmpl.html","rendererTimeControl":"../html/controls/basic/rendererTimeControl.tmpl.html","rendererUrlControl":"../html/controls/basic/rendererUrlControl.tmpl.html","rendererImageControl":"../html/controls/advanced/rendererImageControl.tmpl.html","rendererPhoneControl":"../html/controls/advanced/rendererPhoneControl.tmpl.html","rendererVideoControl":"../html/controls/advanced/rendererVideoControl.tmpl.html","rendererIdentityControl":"../html/controls/advanced/rendererIdentityControl.tmpl.html","rendererPanelControl":"../html/controls/layout/rendererPanelControl.tmpl.html","rendererSectionControl":"../html/controls/layout/rendererSectionControl.tmpl.html","rendererFormReferenceControl":"../html/controls/form/rendererFormReferenceControl.tmpl.html","rendererTabControl":"../html/controls/layout/rendererTabControl.tmpl.html","rendererRepeatableSectionControl":"../html/controls/layout/rendererRepeatableSectionControl.tmpl.html","rendererTableControl":"../html/controls/layout/rendererTableControl.tmpl.html","rendererTableRow":"../html/controls/layout/rendererTableRow.tmpl.html","rendererRepeatableRow":"../html/controls/layout/rendererRepeatableRow.tmpl.html","rendererRepeatableItem":"../html/controls/layout/rendererRepeatableItem.tmpl.html","rendererTabContainerControl":"../html/controls/layout/rendererTabContainerControl.tmpl.html","IconComponent":"images/IconComponent","rendererImg":"../images","Class":"../../../bower_components/composer.js.utils/src/main/js/mvc/Class","Enum":"../../../bower_components/composer.js.utils/src/main/js/mvc/Enum","Assert":"../../../bower_components/composer.js.utils/src/main/js/utils/assert","UUID":"../../../bower_components/composer.js.utils/src/main/js/utils/UUID","ADFUtils":"../../../bower_components/composer.js.utils/src/main/js/utils/ADFUtils","StringUtils":"../../../bower_components/composer.js.utils/src/main/js/utils/StringUtils","AnimationUtils":"../../../bower_components/composer.js.utils/src/main/js/utils/AnimationUtils","WebpackUtils":"../../../bower_components/composer.js.utils/src/main/js/utils/WebpackUtils","ColorUtils":"../../../bower_components/composer.js.utils/src/main/js/utils/ColorUtils","CookieUtil":"../../../bower_components/composer.js.utils/src/main/js/utils/CookieUtil","PromiseMultiple":"../../../bower_components/composer.js.utils/src/main/js/utils/PromiseMultiple","KnockoutCustomBindingHandlers":"../../../bower_components/composer.js.utils/src/main/js/utils/KnockoutCustomBindingHandlers","EventsHub":"../../../bower_components/composer.js.utils/src/main/js/communication/EventsHub","Delta":"../../../bower_components/composer.js.utils/src/main/js/units/Delta","Location":"../../../bower_components/composer.js.utils/src/main/js/units/Location","Size":"../../../bower_components/composer.js.utils/src/main/js/units/Size","Color":"../../../bower_components/composer.js.utils/src/main/js/units/Color","MeasureUnit":"../../../bower_components/composer.js.utils/src/main/js/units/MeasureUnit","PaperSize":"../../../bower_components/composer.js.utils/src/main/js/units/PaperSize","PaperOrientation":"../../../bower_components/composer.js.utils/src/main/js/units/PaperOrientation","ScaleDirection":"../../../bower_components/composer.js.utils/src/main/js/units/ScaleDirection","Keys":"../../../bower_components/composer.js.utils/src/main/js/units/Keys","DomPolyfill":"../../../bower_components/composer.js.utils/src/main/js/utils/DomPolyfill","CommunicationViewModel":"../../../bower_components/forms.communication/src/main/js/communication/CommunicationViewModel","Handler":"../../../bower_components/forms.communication/src/main/js/communication/handlers/Handler","ojidentity":"../../../bower_components/identity-browser/src/main/js/ojidentity"}

}
);