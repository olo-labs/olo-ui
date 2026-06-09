import{j as a}from"./jsx-runtime-DFAAy_2V.js";import"./index-Bc2G9s8g.js";function p({message:y="Something went wrong.",onRetry:s,className:f=""}){return a.jsxs("div",{className:`error-state ${f}`.trim(),role:"alert",children:[a.jsx("p",{className:"error-state-message",children:y}),s&&a.jsx("button",{type:"button",className:"error-state-retry tenant-config-btn primary",onClick:s,children:"Retry"})]})}p.__docgenInfo={description:`Standard error state: message + optional retry button.\r
Use for failed fetches or operations so error UX is consistent.`,methods:[],displayName:"ErrorState",props:{message:{required:!1,tsType:{name:"string"},description:"Error message to show",defaultValue:{value:"'Something went wrong.'",computed:!1}},onRetry:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback when user clicks retry"},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const w={title:"States/ErrorState",component:p,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{message:{control:"text"},onRetry:{action:"retry"}}},e={args:{message:"Something went wrong."}},r={args:{message:"Failed to load tenants. Check your connection and try again.",onRetry:()=>{}}},t={args:{message:"Unable to save tenant. The name may already be in use.",onRetry:()=>{}}};var n,o,i;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    message: 'Something went wrong.'
  }
}`,...(i=(o=e.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};var c,m,d;r.parameters={...r.parameters,docs:{...(c=r.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    message: 'Failed to load tenants. Check your connection and try again.',
    onRetry: () => {}
  }
}`,...(d=(m=r.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};var l,u,g;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    message: 'Unable to save tenant. The name may already be in use.',
    onRetry: () => {}
  }
}`,...(g=(u=t.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};const b=["Default","WithRetry","CustomMessage"];export{t as CustomMessage,e as Default,r as WithRetry,b as __namedExportsOrder,w as default};
