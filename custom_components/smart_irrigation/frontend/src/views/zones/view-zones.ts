import { TemplateResult, LitElement, html, CSSResultGroup, css } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { query } from "lit/decorators.js";
import { property, customElement } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";
import { loadHaForm } from "../../load-ha-elements";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  mdiInformationOutline,
  mdiDelete,
  mdiCalculator,
  mdiUpdate,
} from "@mdi/js";
import {
  deleteZone,
  fetchConfig,
  fetchZones,
  saveZone,
  calculateZone,
  updateZone,
  fetchModules,
  fetchMappings,
  calculateAllZones,
  updateAllZones,
} from "../../data/websockets";
import { SubscribeMixin } from "../../subscribe-mixin";

import {
  SmartIrrigationConfig,
  SmartIrrigationZone,
  SmartIrrigationZoneState,
  SmartIrrigationModule,
  SmartIrrigationMapping,
} from "../../types";
import { output_unit } from "../../helpers";
import { commonStyle } from "../../styles";
import { localize } from "../../../localize/localize";
import {
  DOMAIN,
  MAPPING_DATA,
  UNIT_SECONDS,
  ZONE_BUCKET,
  ZONE_DURATION,
  ZONE_LEAD_TIME,
  ZONE_MAPPING,
  ZONE_MODULE,
  ZONE_MULTIPLIER,
  ZONE_NAME,
  ZONE_SIZE,
  ZONE_STATE,
  ZONE_THROUGHPUT,
} from "../../const";

@customElement("smart-irrigation-view-zones")
class SmartIrrigationViewZones extends SubscribeMixin(LitElement) {
  hass?: HomeAssistant;
  @property() config?: SmartIrrigationConfig;

  @property({ type: Array })
  private zones: SmartIrrigationZone[] = [];
  @property({ type: Array })
  private modules: SmartIrrigationModule[] = [];
  @property({ type: Array })
  private mappings: SmartIrrigationMapping[] = [];

  @query("#nameInput")
  private nameInput!: HTMLInputElement;

  @query("#sizeInput")
  private sizeInput!: HTMLInputElement;

  @query("#throughputInput")
  private throughputInput!: HTMLInputElement;

  /*constructor() {
    super();
    this._fetchData();
  }*/
  firstUpdated() {
    (async () => await loadHaForm())();
    //this._fetchData();
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this._fetchData();
    return [
      this.hass!.connection.subscribeMessage(() => this._fetchData(), {
        type: DOMAIN + "_config_updated",
      }),
    ];
  }

  private async _fetchData(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this.config = await fetchConfig(this.hass);
    this.zones = await fetchZones(this.hass);
    this.modules = await fetchModules(this.hass);
    this.mappings = await fetchMappings(this.hass);

    /*Object.entries(this.modules).forEach(([key, value]) =>
      console.log(key, value)
    );*/
  }

  private handleCalculateAllZones(): void {
    if (!this.hass) {
      return;
    }
    calculateAllZones(this.hass);
  }

  private handleUpdateAllZones(): void {
    if (!this.hass) {
      return;
    }
    updateAllZones(this.hass);
  }

  private handleAddZone(): void {
    const newZone: SmartIrrigationZone = {
      id: this.zones.length, //new zone will have ID that is equal to current zone length.
      name: this.nameInput.value,
      size: parseFloat(this.sizeInput.value),
      throughput: parseFloat(this.throughputInput.value),
      state: SmartIrrigationZoneState.Automatic,
      duration: 0,
      bucket: 0,
      module: undefined,
      old_bucket: 0,
      delta: 0,
      explanation: "",
      multiplier: 1,
      mapping: undefined,
      lead_time: 0,
    };

    this.zones = [...this.zones, newZone];

    this.saveToHA(newZone);
  }

  private handleEditZone(
    index: number,
    updatedZone: SmartIrrigationZone
  ): void {
    this.zones = Object.values(this.zones).map((zone, i) =>
      i === index ? updatedZone : zone
    );
    this.saveToHA(updatedZone);
  }

  private handleRemoveZone(ev: Event, index: number): void {
    if (!this.hass) {
      return;
    }
    /*showConfirmationDialog(
      ev,
      "Are you sure you want to delete this zone?",
      index
    );*/
    //const dialog = new ConfirmationDialog();
    //dialog.showDialog("{'message':'Test!'}");
    this.zones = this.zones.filter((_, i) => i !== index);
    if (!this.hass) {
      return;
    }
    deleteZone(this.hass, index.toString());
  }

  private handleCalculateZone(index: number): void {
    const zone = Object.values(this.zones).at(index);
    if (!zone) {
      return;
    }
    if (!this.hass) {
      return;
    }
    //call the calculate method of the module for the zone
    calculateZone(this.hass, index.toString());
  }

  private handleUpdateZone(index: number): void {
    const zone = Object.values(this.zones).at(index);
    if (!zone) {
      return;
    }
    if (!this.hass) {
      return;
    }
    updateZone(this.hass, index.toString());
  }
  private saveToHA(zone: SmartIrrigationZone): void {
    if (!this.hass) {
      return;
    }
    saveZone(this.hass, zone);
  }
  private renderZone(zone: SmartIrrigationZone, index: number): TemplateResult {
    if (!this.hass) {
      return html``;
    } else {
      let explanation_svg_to_show;
      if (zone.explanation != null && zone.explanation.length > 0) {
        explanation_svg_to_show = html`<svg
          style="width:24px;height:24px"
          viewBox="0 0 24 24"
          id="showcalcresults${index}"
          @click="${() => this.toggleExplanation(index)}"
        >
          <title>
            ${localize("panels.zones.actions.information", this.hass.language)}
          </title>
          <path fill="#404040" d="${mdiInformationOutline}" />
        </svg>`;
      }
      let calculation_svg_to_show;
      if (zone.state === SmartIrrigationZoneState.Automatic) {
        calculation_svg_to_show = html` <svg
          style="width:24px;height:24px"
          viewBox="0 0 24 24"
          @click="${() => this.handleCalculateZone(index)}"
        >
          <title>
            ${localize("panels.zones.actions.calculate", this.hass.language)}
          </title>
          <path fill="#404040" d="${mdiCalculator}" />
        </svg>`;
      }
      let update_svg_to_show;
      if (zone.state === SmartIrrigationZoneState.Automatic) {
        update_svg_to_show = html` <svg
          style="width:24px;height:24px"
          viewBox="0 0 24 24"
          @click="${() => this.handleUpdateZone(index)}"
        >
          <title>
            ${localize("panels.zones.actions.update", this.hass.language)}
          </title>
          <path fill="#404040" d="${mdiUpdate}" />
        </svg>`;
      }
      return html`
        <ha-card header="${zone.name}">
          <div class="card-content">
            <label for="name${index}"
              >${localize(
                "panels.zones.labels.name",
                this.hass.language
              )}:</label
            >
            <input
              id="name${index}"
              type="text"
              .value="${zone.name}"
              @input="${(e: Event) =>
                this.handleEditZone(index, {
                  ...zone,
                  [ZONE_NAME]: (e.target as HTMLInputElement).value,
                })}"
            />
            <div class="zoneline">
              <label for="size${index}"
                >${localize("panels.zones.labels.size", this.hass.language)}
                (${output_unit(this.config, ZONE_SIZE)}):</label
              >
              <input class="shortinput" id="size${index}" type="number""
              .value="${zone.size}"
              @input="${(e: Event) =>
                this.handleEditZone(index, {
                  ...zone,
                  [ZONE_SIZE]: parseFloat((e.target as HTMLInputElement).value),
                })}"
              />
            </div>
            <div class="zoneline">
              <label for="throughput${index}"
                >${localize(
                  "panels.zones.labels.throughput",
                  this.hass.language
                )}
                (${output_unit(this.config, ZONE_THROUGHPUT)}):</label
              >
              <input
                class="shortinput"
                id="throughput${index}"
                type="number"
                .value="${zone.throughput}"
                @input="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_THROUGHPUT]: parseFloat(
                      (e.target as HTMLInputElement).value
                    ),
                  })}"
              />
            </div>
            <div class="zoneline">
              <label for="state${index}"
                >${localize(
                  "panels.zones.labels.state",
                  this.hass.language
                )}:</label
              >
              <select
                required
                id="state${index}"
                @change="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_STATE]: (e.target as HTMLSelectElement)
                      .value as SmartIrrigationZoneState,
                    [ZONE_DURATION]: 0,
                  })}"
              >
                <option
                  value="${SmartIrrigationZoneState.Automatic}"
                  ?selected="${zone.state ===
                  SmartIrrigationZoneState.Automatic}"
                >
                  ${localize(
                    "panels.zones.labels.states.automatic",
                    this.hass.language
                  )}
                </option>
                <option
                  value="${SmartIrrigationZoneState.Disabled}"
                  ?selected="${zone.state ===
                  SmartIrrigationZoneState.Disabled}"
                >
                  ${localize(
                    "panels.zones.labels.states.disabled",
                    this.hass.language
                  )}
                </option>
                <option
                  value="${SmartIrrigationZoneState.Manual}"
                  ?selected="${zone.state === SmartIrrigationZoneState.Manual}"
                >
                  ${localize(
                    "panels.zones.labels.states.manual",
                    this.hass.language
                  )}
                </option>
              </select>
              <label for="module${index}"
                >${localize("common.labels.module", this.hass.language)}:</label
              >

              <select
                id="module${index}"
                @change="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_MODULE]: parseInt(
                      (e.target as HTMLSelectElement).value
                    ),
                  })}"
              >
                ${Object.entries(this.modules).map(
                  ([key, value]) =>
                    /*html`<option value="${value["id"]}" ?selected="${
                    zone.module === value["id"]
                  }>
                    ${value["id"]}: ${value["name"]}
                  </option>`*/
                    html`<option
                      value="${value["id"]}"
                      ?selected="${zone.module === value["id"]}"
                    >
                      ${value["id"]}: ${value["name"]}
                    </option>`
                )}
              </select>
              <label for="module${index}"
                >${localize(
                  "panels.zones.labels.mapping",
                  this.hass.language
                )}:</label
              >

              <select
                id="mapping${index}"
                @change="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_MAPPING]: parseInt(
                      (e.target as HTMLSelectElement).value
                    ),
                  })}"
              >
                ${Object.entries(this.mappings).map(
                  ([key, value]) =>
                    /*html`<option value="${value["id"]}" ?selected="${
                    zone.module === value["id"]
                  }>
                    ${value["id"]}: ${value["name"]}
                  </option>`*/
                    html`<option
                      value="${value["id"]}"
                      ?selected="${zone.mapping === value["id"]}"
                    >
                      ${value["id"]}: ${value["name"]}
                    </option>`
                )}
              </select>
            </div>
            <div class="zoneline">
              <label for="bucket${index}"
                >${localize(
                  "panels.zones.labels.bucket",
                  this.hass.language
                )}:</label
              >
              <input
                class="shortinput"
                id="bucket${index}"
                type="number"
                .value="${zone.bucket}"
                @input="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_BUCKET]: parseFloat(
                      (e.target as HTMLInputElement).value
                    ),
                  })}"
              />
              <label for="lead_time${index}"
                >${localize(
                  "panels.zones.labels.lead-time",
                  this.hass.language
                )}
                (s):</label
              >
              <input
                class="shortinput"
                id="lead_time${index}"
                type="number"
                .value="${zone.lead_time}"
                @input="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_LEAD_TIME]: parseInt(
                      (e.target as HTMLInputElement).value,
                      10
                    ),
                  })}"
              />
            </div>
            <div class="zoneline">
              <label for="multiplier${index}"
                >${localize(
                  "panels.zones.labels.multiplier",
                  this.hass.language
                )}:</label
              >
              <input
                class="shortinput"
                id="multiplier${index}"
                type="number"
                .value="${zone.multiplier}"
                @input="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_MULTIPLIER]: parseInt(
                      (e.target as HTMLInputElement).value,
                      10
                    ),
                  })}"
              />
              <label for="duration${index}"
                >${localize("panels.zones.labels.duration", this.hass.language)}
                (${UNIT_SECONDS}):</label
              >
              <input
                class="shortinput"
                id="duration${index}"
                type="number"
                .value="${zone.duration}"
                ?readonly="${zone.state === SmartIrrigationZoneState.Disabled ||
                zone.state === SmartIrrigationZoneState.Automatic}"
                @input="${(e: Event) =>
                  this.handleEditZone(index, {
                    ...zone,
                    [ZONE_DURATION]: parseInt(
                      (e.target as HTMLInputElement).value,
                      10
                    ),
                  })}"
              />
            </div>
            <div class="zoneline">
              ${update_svg_to_show} ${calculation_svg_to_show}
              ${explanation_svg_to_show}
              <svg
                style="width:24px;height:24px"
                viewBox="0 0 24 24"
                id="deleteZone${index}"
                @click="${(e: Event) => this.handleRemoveZone(e, index)}"
              >
                <title>
                  ${localize("common.actions.delete", this.hass.language)}
                </title>
                <path fill="#404040" d="${mdiDelete}" />
              </svg>
            </div>
            <div class="zoneline">
              <div>
                <label class="hidden" id="calcresults${index}"
                  >${unsafeHTML("<br/>" + zone.explanation)}</label
                >
              </div>
            </div>
          </div>
        </ha-card>
      `;
    }
  }

  toggleExplanation(index: number) {
    const el = this.shadowRoot?.querySelector("#calcresults" + index);
    //const bt = this.shadowRoot?.querySelector("#showcalcresults" + index);
    //if (!el || !bt) {
    if (!el) {
      return;
    } else {
      if (el.className != "hidden") {
        el.className = "hidden";
        //bt.textContent = "Show calculation explanation";
      } else {
        el.className = "explanation";
        //bt.textContent = "Hide explanation";
      }
    }
  }

  render(): TemplateResult {
    if (!this.hass || !this.config) {
      return html``;
    } else {
      return html`
        <ha-card header="${localize("panels.zones.title", this.hass.language)}">
          <div class="card-content">
            ${localize("panels.zones.description", this.hass.language)}
          </div>
        </ha-card>
          <ha-card header="${localize(
            "panels.zones.cards.add-zone.header",
            this.hass.language
          )}">
            <div class="card-content">
              <div class="zoneline"><label for="nameInput">${localize(
                "panels.zones.labels.name",
                this.hass.language
              )}:</label>
              <input id="nameInput" type="text"/>
              </div>
              <div class="zoneline">
              <label for="sizeInput">${localize(
                "panels.zones.labels.size",
                this.hass.language
              )} (${output_unit(this.config, ZONE_SIZE)}):</label>
              <input class="shortinput" id="sizeInput" type="number"/>
              </div>
              <div class="zoneline">
              <label for="throughputInput">${localize(
                "panels.zones.labels.throughput",
                this.hass.language
              )} (${output_unit(this.config, ZONE_THROUGHPUT)}):</label>
              <input id="throughputInput" class="shortinput" type="number"/>
              </div>
              <div class="zoneline">
              <button @click="${this.handleAddZone}">${localize(
        "panels.zones.cards.add-zone.actions.add",
        this.hass.language
      )}</button>
              </div>
            </div>
            </ha-card>
            <ha-card header="${localize(
              "panels.zones.cards.zone-actions.header",
              this.hass.language
            )}">
            <div class="card-content">
                <button @click="${this.handleUpdateAllZones}">${localize(
        "panels.zones.cards.zone-actions.actions.update-all",
        this.hass.language
      )}</button>
                <button @click="${this.handleCalculateAllZones}">${localize(
        "panels.zones.cards.zone-actions.actions.calculate-all",
        this.hass.language
      )}</button>
            </div>
          </ha-card>

          ${Object.entries(this.zones).map(([key, value]) =>
            this.renderZone(value, value["id"])
          )}
        </ha-card>
      `;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ${commonStyle}
      .zone {
        margin-top: 25px;
        margin-bottom: 25px;
      }
      .hidden {
        display: none;
      }
      .shortinput {
        width: 50px;
      }
      .zoneline {
        margin-left: 20px;
        margin-top: 5px;
      }
    `;
  }
}
