import{j as t}from"./jsx-runtime-DFAAy_2V.js";import"./index-Bc2G9s8g.js";function u({message:r="Loading…",className:f=""}){return t.jsxs("div",{className:`loading-state ${f}`.trim(),role:"status","aria-live":"polite",children:[t.jsx("div",{className:"loading-state-spinner","aria-hidden":!0}),r&&t.jsx("p",{className:"loading-state-message",children:r})]})}u.__docgenInfo={description:`Standard loading state: spinner + optional message.\r
Use for async content (lists, detail views) so loading UX is consistent.`,methods:[],displayName:"LoadingState",props:{message:{required:!1,tsType:{name:"string"},description:"Optional message below the spinner",defaultValue:{value:"'Loading…'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const S={title:"States/LoadingState",component:u,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{message:{control:"text"}}},e={args:{message:"Loading…"}},s={args:{message:"Loading tenants…"}},a={args:{message:""}};var o,n,i;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    message: 'Loading…'
  }
}`,...(i=(n=e.parameters)==null?void 0:n.docs)==null?void 0:i.source}}};var d,c,m;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    message: 'Loading tenants…'
  }
}`,...(m=(c=s.parameters)==null?void 0:c.docs)==null?void 0:m.source}}};var g,l,p;a.parameters={...a.parameters,docs:{...(g=a.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    message: ''
  }
}`,...(p=(l=a.parameters)==null?void 0:l.docs)==null?void 0:p.source}}};const N=["Default","CustomMessage","NoMessage"];export{s as CustomMessage,e as Default,a as NoMessage,N as __namedExportsOrder,S as default};
