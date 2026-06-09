import{j as e}from"./jsx-runtime-DFAAy_2V.js";import{r as L}from"./index-Bc2G9s8g.js";function M(t){return t.name!=null&&t.name.trim()!==""?t.name.trim():t.id}function b({tenants:t,loading:v,selectedTenantId:C,onSelectTenant:j,onAddNew:A,onDeleteTenant:k}){const[a,d]=L.useState(null),I=(n,c)=>{n.preventDefault(),d({x:n.clientX,y:n.clientY,tenant:c})},q=()=>{a&&(k(a.tenant.id),d(null))},m=()=>d(null);return e.jsxs("div",{className:"tenant-config-list",children:[e.jsxs("div",{className:"tenant-config-list-header",children:[e.jsx("span",{className:"tenant-config-list-title",children:"Tenants"}),e.jsx("button",{type:"button",className:"tenant-config-add-btn",onClick:A,title:"Add new tenant","aria-label":"Add new tenant",children:"+"})]}),v?e.jsx("p",{className:"tenant-config-message",children:"Loading…"}):t.length===0?e.jsx("p",{className:"tenant-config-message",children:"No tenants. Click + to add."}):e.jsx("ul",{className:"tenant-config-list-ul",children:t.map(n=>e.jsx("li",{className:`tenant-config-list-item ${C===n.id?"selected":""}`,onClick:()=>j(n),onContextMenu:c=>I(c,n),children:M(n)},n.id))}),a&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"tenant-config-context-backdrop",onClick:m,onContextMenu:m}),e.jsx("div",{className:"tenant-config-context-menu",style:{left:a.x,top:a.y},children:e.jsx("button",{type:"button",className:"tenant-config-context-item danger",onClick:q,children:"Delete tenant"})})]})]})}b.__docgenInfo={description:"",methods:[],displayName:"TenantConfigurationList",props:{tenants:{required:!0,tsType:{name:"Array",elements:[{name:"Tenant"}],raw:"Tenant[]"},description:""},loading:{required:!0,tsType:{name:"boolean"},description:""},selectedTenantId:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""},onSelectTenant:{required:!0,tsType:{name:"signature",type:"function",raw:"(tenant: Tenant) => void",signature:{arguments:[{type:{name:"Tenant"},name:"tenant"}],return:{name:"void"}}},description:""},onAddNew:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onDeleteTenant:{required:!0,tsType:{name:"signature",type:"function",raw:"(id: string) => void",signature:{arguments:[{type:{name:"string"},name:"id"}],return:{name:"void"}}},description:""}}};const l=[{id:"2a2a91fb-f5b4-4cf0-b917-524d242b2e3d",name:"Acme Corp",description:"Production tenant",configVersion:"1.0"},{id:"b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d6e",name:"",description:void 0,configVersion:"2.0"},{id:"tenant-dev",name:"Dev Tenant",description:"Development",configVersion:""}],V={title:"Configuration/TenantConfigurationList",component:b,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{onSelectTenant:{action:"selectTenant"},onAddNew:{action:"addNew"},onDeleteTenant:{action:"deleteTenant"}}},s={args:{tenants:l,loading:!1,selectedTenantId:l[0].id,onSelectTenant:()=>{},onAddNew:()=>{},onDeleteTenant:()=>{}}},o={args:{tenants:[],loading:!1,selectedTenantId:null,onSelectTenant:()=>{},onAddNew:()=>{},onDeleteTenant:()=>{}}},r={args:{tenants:[],loading:!0,selectedTenantId:null,onSelectTenant:()=>{},onAddNew:()=>{},onDeleteTenant:()=>{}}},i={args:{tenants:l,loading:!1,selectedTenantId:null,onSelectTenant:()=>{},onAddNew:()=>{},onDeleteTenant:()=>{}}};var u,g,p;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    tenants: mockTenants,
    loading: false,
    selectedTenantId: mockTenants[0].id,
    onSelectTenant: () => {},
    onAddNew: () => {},
    onDeleteTenant: () => {}
  }
}`,...(p=(g=s.parameters)==null?void 0:g.docs)==null?void 0:p.source}}};var T,f,x;o.parameters={...o.parameters,docs:{...(T=o.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    tenants: [],
    loading: false,
    selectedTenantId: null,
    onSelectTenant: () => {},
    onAddNew: () => {},
    onDeleteTenant: () => {}
  }
}`,...(x=(f=o.parameters)==null?void 0:f.docs)==null?void 0:x.source}}};var N,y,h;r.parameters={...r.parameters,docs:{...(N=r.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    tenants: [],
    loading: true,
    selectedTenantId: null,
    onSelectTenant: () => {},
    onAddNew: () => {},
    onDeleteTenant: () => {}
  }
}`,...(h=(y=r.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};var w,S,D;i.parameters={...i.parameters,docs:{...(w=i.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    tenants: mockTenants,
    loading: false,
    selectedTenantId: null,
    onSelectTenant: () => {},
    onAddNew: () => {},
    onDeleteTenant: () => {}
  }
}`,...(D=(S=i.parameters)==null?void 0:S.docs)==null?void 0:D.source}}};const W=["WithTenants","Empty","Loading","NoSelection"];export{o as Empty,r as Loading,i as NoSelection,s as WithTenants,W as __namedExportsOrder,V as default};
