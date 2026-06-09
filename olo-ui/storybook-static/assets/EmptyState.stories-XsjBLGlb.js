import{j as a}from"./jsx-runtime-DFAAy_2V.js";import"./index-Bc2G9s8g.js";function g({message:y,hint:n,className:h=""}){return a.jsxs("div",{className:`empty-state ${h}`.trim(),children:[a.jsx("p",{className:"empty-state-message",children:y}),n&&a.jsx("p",{className:"empty-state-hint",children:n})]})}g.__docgenInfo={description:`Standard empty state: message + optional hint.\r
Use when a list is empty or nothing is selected so empty UX is consistent.`,methods:[],displayName:"EmptyState",props:{message:{required:!0,tsType:{name:"string"},description:"Message to show when there is no data / no selection"},hint:{required:!1,tsType:{name:"string"},description:"Optional secondary text or hint"},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const N={title:"States/EmptyState",component:g,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{message:{control:"text"},hint:{control:"text"}}},e={args:{message:"No tenants yet",hint:"Click + to add your first tenant."}},t={args:{message:"No runs in this environment"}},s={args:{message:"No data to display",hint:"Select a tenant and environment above, or run a pipeline to see execution history here."}};var r,o,i;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    message: 'No tenants yet',
    hint: 'Click + to add your first tenant.'
  }
}`,...(i=(o=e.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};var m,c,p;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    message: 'No runs in this environment'
  }
}`,...(p=(c=t.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};var d,l,u;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    message: 'No data to display',
    hint: 'Select a tenant and environment above, or run a pipeline to see execution history here.'
  }
}`,...(u=(l=s.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};const S=["Default","MessageOnly","WithLongHint"];export{e as Default,t as MessageOnly,s as WithLongHint,S as __namedExportsOrder,N as default};
