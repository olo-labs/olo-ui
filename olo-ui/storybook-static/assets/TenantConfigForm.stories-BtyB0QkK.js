import{j as e}from"./jsx-runtime-DFAAy_2V.js";import{r as t}from"./index-Bc2G9s8g.js";function k({tenant:n,isAddingNew:F,onSave:P}){const[g,c]=t.useState(""),[p,l]=t.useState(""),[f,d]=t.useState(""),[v,m]=t.useState(""),[N,y]=t.useState(!1),[S,u]=t.useState(null);t.useEffect(()=>{n?(c(n.id),l(n.name??""),d(n.description??""),m(n.configVersion??"")):(c(""),l(""),d(""),m(""))},[n]);const _=async a=>{a.preventDefault();const h=g.trim();if(!h){u("ID is required");return}u(null),y(!0);try{await P({id:h,name:p.trim(),description:f.trim(),configVersion:v.trim()})}catch(x){u(x instanceof Error?x.message:"Failed to save")}finally{y(!1)}};return!n&&!F?e.jsx("div",{className:"tenant-config-form-empty",children:"Select a tenant from the list or click + to add a new one."}):e.jsxs("form",{className:"tenant-config-form-inner",onSubmit:_,children:[e.jsx("div",{className:"side-panel-title",children:"Tenant details"}),S&&e.jsx("div",{className:"tenant-config-error",role:"alert",children:S}),e.jsxs("div",{className:"tenant-config-form-row",children:[e.jsx("label",{className:"tenant-config-label",children:"ID"}),e.jsx("input",{className:"tenant-config-input",value:g,onChange:a=>c(a.target.value),placeholder:"e.g. UUID or tenant key",required:!0,readOnly:!!n})]}),e.jsxs("div",{className:"tenant-config-form-row",children:[e.jsx("label",{className:"tenant-config-label",children:"Name"}),e.jsx("input",{className:"tenant-config-input",value:p,onChange:a=>l(a.target.value),placeholder:"Display name"})]}),e.jsxs("div",{className:"tenant-config-form-row",children:[e.jsx("label",{className:"tenant-config-label",children:"Description"}),e.jsx("input",{className:"tenant-config-input",value:f,onChange:a=>d(a.target.value),placeholder:"Optional description"})]}),e.jsxs("div",{className:"tenant-config-form-row",children:[e.jsx("label",{className:"tenant-config-label",children:"Config version"}),e.jsx("input",{className:"tenant-config-input",value:v,onChange:a=>m(a.target.value),placeholder:"e.g. 1.0"})]}),e.jsx("div",{className:"tenant-config-form-actions tenant-config-form-actions-bottom",children:e.jsx("button",{type:"submit",className:"tenant-config-btn primary",disabled:N,children:N?"Saving…":n?"Update":"Add"})})]})}k.__docgenInfo={description:"",methods:[],displayName:"TenantConfigForm",props:{tenant:{required:!0,tsType:{name:"union",raw:"Tenant | null",elements:[{name:"Tenant"},{name:"null"}]},description:""},isAddingNew:{required:!0,tsType:{name:"boolean"},description:""},onSave:{required:!0,tsType:{name:"signature",type:"function",raw:"(tenant: Tenant) => Promise<void>",signature:{arguments:[{type:{name:"Tenant"},name:"tenant"}],return:{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"}}},description:""}}};const O={id:"2a2a91fb-f5b4-4cf0-b917-524d242b2e3d",name:"Acme Corp",description:"Production tenant",configVersion:"1.0"},z={title:"Configuration/TenantConfigForm",component:k,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{onSave:{action:"save"}}},s={args:{tenant:null,isAddingNew:!1,onSave:async()=>{}}},r={args:{tenant:null,isAddingNew:!0,onSave:async n=>{console.log("Save new tenant",n)}}},o={args:{tenant:O,isAddingNew:!1,onSave:async n=>{console.log("Update tenant",n)}}},i={args:{tenant:{id:"uuid-only",name:""},isAddingNew:!1,onSave:async()=>{}}};var w,b,j;s.parameters={...s.parameters,docs:{...(w=s.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    tenant: null,
    isAddingNew: false,
    onSave: async () => {}
  }
}`,...(j=(b=s.parameters)==null?void 0:b.docs)==null?void 0:j.source}}};var T,E,A;r.parameters={...r.parameters,docs:{...(T=r.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    tenant: null,
    isAddingNew: true,
    onSave: async tenant => {
      console.log('Save new tenant', tenant);
    }
  }
}`,...(A=(E=r.parameters)==null?void 0:E.docs)==null?void 0:A.source}}};var C,D,q;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    tenant: mockTenant,
    isAddingNew: false,
    onSave: async tenant => {
      console.log('Update tenant', tenant);
    }
  }
}`,...(q=(D=o.parameters)==null?void 0:D.docs)==null?void 0:q.source}}};var I,U,V;i.parameters={...i.parameters,docs:{...(I=i.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    tenant: {
      id: 'uuid-only',
      name: ''
    },
    isAddingNew: false,
    onSave: async () => {}
  }
}`,...(V=(U=i.parameters)==null?void 0:U.docs)==null?void 0:V.source}}};const B=["EmptyState","AddNew","EditExisting","EditMinimalTenant"];export{r as AddNew,o as EditExisting,i as EditMinimalTenant,s as EmptyState,B as __namedExportsOrder,z as default};
